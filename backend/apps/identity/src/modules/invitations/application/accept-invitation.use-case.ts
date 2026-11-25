import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { UsageMetric } from '@contracts/billing';
import { IdentityErrorCode, type Permission } from '@contracts/identity';
import { Clock, TransactionManager } from '@platform/kernel';
import { QuotaChecker, QuotaExceededError } from '@platform/quotas';
import { SecretHasher } from '../../../security/secret-hasher.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { AccessFacade } from '../../access/index.js';
import { ApiKeysFacade } from '../../api-keys/index.js';
import { UsersFacade } from '../../users/index.js';
import type { InvitationPreview } from '../domain/invitation-preview.js';
import { InvitationRepository } from '../domain/invitation.repository.js';
import { InvitationToken } from '../domain/invitation-token.js';
import type { Invitation } from '../domain/invitation.js';

/**
 * Accepts invitations. Accepting requires a verified email equal to the invited one, an inviter who can
 * still grant the groups of the invitation, and a seat in the plan of the tenant, counted under the tenant
 * lock so concurrent acceptances never go past it. The membership is added before marking the invitation
 * and outside its transaction, because it also touches the user shard: a retry finds the invitation still
 * pending, and adding the member again changes nothing nor takes another seat.
 */
@Injectable()
export class AcceptInvitation {
  constructor(
    private readonly invitations: InvitationRepository,
    private readonly access: AccessFacade,
    private readonly apiKeys: ApiKeysFacade,
    private readonly users: UsersFacade,
    private readonly quotas: QuotaChecker,
    private readonly hasher: SecretHasher,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
  ) {}

  /**
   * Accepts with the account of the session.
   * @param user Account that accepts.
   * @param text Emailed token.
   * @throws IdentityError `IDENTITY.INVITATION.EMAIL_MISMATCH` if the email is unverified or another.
   * @throws IdentityError `IDENTITY.INVITATION.INVALID` if the invitation is unusable or its inviter can no
   *   longer grant its groups, or every owner of the tenant is leaving.
   * @throws QuotaExceededError `BILLING.QUOTA.EXCEEDED` if the plan admits no other user.
   */
  async execute(user: UserRef, text: string): Promise<void> {
    const snapshot = await this.users.getByRef(user);
    if (snapshot.emailVerifiedAt === undefined) {
      throw new IdentityError(IdentityErrorCode.InvitationEmailMismatch);
    }
    await this.accept(text, user, snapshot.email);
  }

  /**
   * Accepts for a user who just signed up: the token reached their email, which is now verified.
   * @param text Emailed token.
   * @param user New account.
   * @throws IdentityError `IDENTITY.INVITATION.INVALID` if the invitation is unusable or its inviter can no
   *   longer grant its groups, or every owner of the tenant is leaving.
   * @throws QuotaExceededError `BILLING.QUOTA.EXCEEDED` if the plan admits no other user.
   */
  async forNewUser(text: string, user: UserRef): Promise<void> {
    const snapshot = await this.users.getByRef(user);
    await this.accept(text, user, snapshot.email);
  }

  /**
   * Checks before creating an account that the plan has a seat for it: an account that does not exist yet
   * is a member of no tenant.
   * @param tenantId Tenant of the invitation.
   * @throws QuotaExceededError `BILLING.QUOTA.EXCEEDED` if the plan admits no other user.
   */
  async assertRoomForNewUser(tenantId: string): Promise<void> {
    await this.quotas.enforce(tenantId, UsageMetric.Users);
  }

  /**
   * Reads what an invitation offers without accepting it.
   * @param text Emailed token.
   * @returns The invitation, or `undefined` if it is not usable.
   */
  async preview(text: string): Promise<InvitationPreview | undefined> {
    const token = InvitationToken.parse(text);
    if (token === undefined) {
      return undefined;
    }
    const invitation = await this.scopes
      .inTenantShard(token.tenantId, () =>
        this.invitations.findByTokenHash(this.hasher.digest(token.secret)),
      )
      .catch(() => undefined);
    if (invitation === undefined || !invitation.isUsable(this.clock.now())) {
      return undefined;
    }
    const state = invitation.snapshot();
    return {
      invitationId: state.id,
      tenantId: state.tenantId,
      email: state.email,
      groupIds: state.groupIds,
    };
  }

  private async accept(
    text: string,
    user: UserRef,
    email: string,
  ): Promise<void> {
    const token = InvitationToken.parse(text);
    if (token === undefined) {
      throw new IdentityError(IdentityErrorCode.InvitationInvalid);
    }
    const invitation = await this.scopes.inTenantShard(token.tenantId, () =>
      this.usable(token),
    );
    const state = invitation.snapshot();
    if (state.email !== email) {
      throw new IdentityError(IdentityErrorCode.InvitationEmailMismatch);
    }
    await this.assertInviterCanGrant(invitation);
    await this.access.addMember(
      token.tenantId,
      user,
      state.groupIds,
      await this.seatLimitFor(user, token.tenantId),
    );
    await this.scopes.inTenantShard(token.tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const current = await this.usable(token);
        current.accept();
        await this.invitations.update(current);
      }),
    );
  }

  private async assertInviterCanGrant(invitation: Invitation): Promise<void> {
    const { tenantId, invitedBy, groupIds } = invitation.snapshot();
    const granted: readonly Permission[] =
      (await this.apiKeys.activeServicePermissions(tenantId, invitedBy)) ??
      (await this.access.memberPermissions(tenantId, invitedBy));
    try {
      await this.access.assertGroupsWithin(tenantId, groupIds, granted);
    } catch (error) {
      if (error instanceof IdentityError) {
        throw new IdentityError(IdentityErrorCode.InvitationInvalid);
      }
      throw error;
    }
  }

  private async seatLimitFor(
    user: UserRef,
    tenantId: string,
  ): Promise<number | undefined> {
    if (await this.access.isMember(user.userId, tenantId)) {
      return undefined;
    }
    const quota = await this.quotas.check(tenantId, UsageMetric.Users);
    if (!quota.allowed) {
      throw new QuotaExceededError(UsageMetric.Users, quota.limit, quota.used);
    }
    return quota.limit === 0 ? undefined : quota.limit;
  }

  private async usable(token: InvitationToken): Promise<Invitation> {
    const invitation = await this.invitations.findByTokenHash(
      this.hasher.digest(token.secret),
    );
    if (invitation === undefined || !invitation.isUsable(this.clock.now())) {
      throw new IdentityError(IdentityErrorCode.InvitationInvalid);
    }
    return invitation;
  }
}
