import { IdentityErrorCode, TenantRole } from '@contracts/identity';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import type { Group } from './group.js';
import type { Membership } from './membership.js';

/**
 * The rule that a tenant with members always keeps an owner. A member who is leaving (their account is being
 * deleted) no longer counts as an owner, but still counts as a member: their departure may be cancelled. Nobody
 * but a new owner joins a tenant whose every owner is leaving.
 */
export class TenantOwnership {
  private readonly ownerGroupIds: ReadonlySet<string>;

  constructor(groups: readonly Group[]) {
    this.ownerGroupIds = new Set(
      groups
        .filter((group) => group.systemRole === TenantRole.Owner)
        .map((group) => group.id),
    );
  }

  /**
   * Checks that changing the groups of a member, or removing them with no groups, leaves an owner that is not
   * leaving.
   * @param changed Member whose groups change.
   * @param nextGroupIds Groups the member keeps; empty when they are removed.
   * @param memberships Current memberships of the tenant.
   * @throws IdentityError `IDENTITY.ACCESS.LAST_OWNER` if the change leaves no owner.
   */
  assertOwnerRemains(
    changed: Membership,
    nextGroupIds: readonly string[],
    memberships: readonly Membership[],
  ): void {
    const remaining = memberships.filter((membership) =>
      membership.userId === changed.userId
        ? this.staysOwner(membership, nextGroupIds)
        : this.staysOwner(membership, membership.groupIds),
    );
    if (this.isOwner(changed.groupIds) && remaining.length === 0) {
      throw new IdentityError(IdentityErrorCode.AccessLastOwner);
    }
  }

  /**
   * Checks that a member can leave the tenant for good: if anyone else remains, another owner that is not
   * leaving must remain too.
   * @param leaving Member who leaves.
   * @param memberships Current memberships of the tenant.
   * @throws IdentityError `IDENTITY.ACCESS.LAST_OWNER` if they are the last owner and others remain.
   */
  assertCanLeave(
    leaving: Membership,
    memberships: readonly Membership[],
  ): void {
    const others = memberships.filter(
      (membership) => membership.userId !== leaving.userId,
    );
    if (
      this.isOwner(leaving.groupIds) &&
      others.length > 0 &&
      !others.some((membership) =>
        this.staysOwner(membership, membership.groupIds),
      )
    ) {
      throw new IdentityError(IdentityErrorCode.AccessLastOwner);
    }
  }

  /**
   * Checks that a new member can join. While every owner of the tenant is leaving, the departures would leave
   * the newcomer without an owner and the erasure of the last owner would stop, so only someone who joins as
   * an owner is let in.
   * @param groupIds Groups of the new member.
   * @param memberships Current memberships of the tenant.
   * @throws IdentityError `IDENTITY.INVITATION.INVALID` if every owner is leaving and the newcomer is not an owner.
   */
  assertCanJoin(
    groupIds: readonly string[],
    memberships: readonly Membership[],
  ): void {
    const owners = memberships.filter((membership) =>
      this.isOwner(membership.groupIds),
    );
    if (
      !this.isOwner(groupIds) &&
      owners.length > 0 &&
      !owners.some((owner) => this.staysOwner(owner, owner.groupIds))
    ) {
      throw new IdentityError(IdentityErrorCode.InvitationInvalid);
    }
  }

  private staysOwner(
    membership: Membership,
    groupIds: readonly string[],
  ): boolean {
    return membership.leavingSince === null && this.isOwner(groupIds);
  }

  private isOwner(groupIds: readonly string[]): boolean {
    return groupIds.some((id) => this.ownerGroupIds.has(id));
  }
}
