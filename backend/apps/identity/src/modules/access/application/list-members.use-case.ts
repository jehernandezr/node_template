import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import type { MemberPage } from '@contracts/identity';
import { Pagination, type PageQuery } from '@contracts/platform';
import { UsersFacade } from '../../users/index.js';
import { TenantAccessRepository } from '../domain/access-store.js';
import type { Membership } from '../domain/membership.js';

/**
 * Pages through the members of a tenant with their profile, in ascending user id. The cursor is the last
 * user id of the page: ids are UUIDv7 and fit the cursor alphabet. Only the page and one more membership
 * are read, so a large tenant costs the same as a small one.
 */
@Injectable()
export class ListMembers {
  private static readonly USER_ID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  constructor(
    private readonly tenantAccess: TenantAccessRepository,
    private readonly users: UsersFacade,
    private readonly scopes: ShardScopes,
  ) {}

  /**
   * Lists a page of members of the tenant. A cursor that is not a user id lies past every member.
   * @param tenantId Tenant.
   * @param page Page size and the cursor after which the page starts.
   * @returns The page of members.
   */
  async execute(tenantId: string, page: PageQuery = {}): Promise<MemberPage> {
    const limit = page.limit ?? Pagination.defaultLimit;
    if (page.after !== undefined && !ListMembers.USER_ID.test(page.after)) {
      return { items: [], nextCursor: null };
    }
    const read = await this.scopes.inTenantShard(tenantId, () =>
      this.tenantAccess.listMembershipsAfter(page.after, limit + 1),
    );
    const memberships = read.slice(0, limit);
    const last = memberships.at(-1);
    return {
      items: await Promise.all(
        memberships.map((membership) => this.memberOf(membership)),
      ),
      nextCursor:
        read.length > limit && last !== undefined ? last.userId : null,
    };
  }

  private async memberOf(
    membership: Membership,
  ): Promise<MemberPage['items'][number]> {
    const user = await this.users.getByRef({
      userId: membership.userId,
      homeTenantId: membership.homeTenantId,
    });
    return {
      userId: membership.userId,
      email: user.email,
      displayName: user.displayName,
      groupIds: [...membership.groupIds],
      joinedAt: membership.joinedAt.toISOString(),
    };
  }
}
