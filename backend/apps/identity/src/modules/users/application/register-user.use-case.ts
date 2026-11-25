import { Injectable } from '@nestjs/common';
import { Clock, Id, UseCase } from '@platform/kernel';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';
import { normalizeEmail } from '../../../shared/utils/email-normalization.js';
import { IdentityMailer } from '../../alerts/index.js';
import { AccessFacade } from '../../access/index.js';
import { InvitationsFacade } from '../../invitations/index.js';
import { PasswordsFacade } from '../../passwords/index.js';
import {
  EmailProofPurpose,
  EmailProofStore,
} from '../domain/email-proof-store.js';
import type { SignUpCommand } from '../domain/sign-up-command.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { InvitationPreview } from '../../invitations/index.js';
import { UserReader } from './user-reader.js';
import { UserRegistrar } from './user-registrar.js';

/**
 * Registration from the public route. Responds the same whether or not the email exists: if it already has an account, an
 * "ya tienes cuenta" email is sent instead of the verification one. The password policy is checked before
 * looking at the email, so its error does not reveal anything either. The plan quota of the inviting tenant is also
 * checked before creating the account: if it is not enough, no user without a membership is left to block the retry.
 * If another member takes the last slot between that check and the acceptance, the account is created without a membership;
 * the retry with the same invitation accepts it for that account instead of responding that the email already exists.
 */
@Injectable()
export class RegisterUser implements UseCase<SignUpCommand, void> {
  constructor(
    private readonly registrar: UserRegistrar,
    private readonly reader: UserReader,
    private readonly passwords: PasswordsFacade,
    private readonly invitations: InvitationsFacade,
    private readonly access: AccessFacade,
    private readonly proofs: EmailProofStore,
    private readonly mailer: IdentityMailer,
    private readonly clock: Clock,
    private readonly settings: IdentitySettings,
  ) {}

  async execute(command: SignUpCommand): Promise<void> {
    const email = normalizeEmail(command.email);
    await this.passwords.assertAcceptable(command.password, email);
    const invitation =
      command.invitationToken === undefined
        ? undefined
        : await this.invitations.preview(command.invitationToken);
    const invited = invitation !== undefined && invitation.email === email;
    if (invited) {
      await this.invitations.assertRoomForNewUser(invitation);
    }
    const homeTenantId = invited
      ? invitation.tenantId
      : this.settings.values.IDENTITY_DEFAULT_TENANT_ID;
    const ref = await this.registrar.register(
      { ...command, email, homeTenantId },
      invited ? this.clock.now() : undefined,
    );
    if (ref === undefined && invited) {
      const pending = await this.accountLeftByInvitation(email, invitation);
      if (pending !== undefined && command.invitationToken !== undefined) {
        await this.invitations.acceptForNewUser(
          command.invitationToken,
          pending,
        );
        return;
      }
    }
    if (ref === undefined) {
      await this.mailer.send({
        template: IdentityEmailTemplate.EmailAlreadyRegistered,
        to: email,
        locale: command.locale,
        variables: {},
      });
      return;
    }
    if (invited && command.invitationToken !== undefined) {
      await this.invitations.acceptForNewUser(command.invitationToken, ref);
      return;
    }
    await this.access.addMember(homeTenantId, ref, []);
    const token = await this.proofs.issue(EmailProofPurpose.Verification, {
      ...ref,
      email,
    });
    await this.mailer.send({
      template: IdentityEmailTemplate.EmailVerification,
      to: email,
      locale: command.locale,
      variables: { token },
    });
  }

  /**
   * The account left by a registration with this invitation whose acceptance failed: it has the invited email, its home
   * tenant is the inviting one, it was verified after the invitation was issued (which is still pending) and it is not a member of
   * any tenant. An account that was already a member, or that left a tenant before this invitation, does not qualify.
   */
  private async accountLeftByInvitation(
    email: string,
    invitation: InvitationPreview,
  ): Promise<UserRef | undefined> {
    const existing = await this.reader.findByEmail(email);
    const issuedAt = Id.from(invitation.invitationId).timestamp();
    if (
      existing?.homeTenantId !== invitation.tenantId ||
      existing.emailVerifiedAt === undefined ||
      existing.emailVerifiedAt < issuedAt
    ) {
      return undefined;
    }
    const ref = { userId: existing.id, homeTenantId: existing.homeTenantId };
    const tenants = await this.access.tenantsOf(ref);
    return tenants.length === 0 ? ref : undefined;
  }
}
