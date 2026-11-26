import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { Pagination } from '@contracts/platform';
import type {
  ListMembersByPermissionInput,
  UserRefPage,
} from '@contracts/identity';
import { TenantAccessRepository } from '../domain/access-store.js';
import { EffectiveAccessCalculator } from '../domain/effective-access-calculator.js';

/**
 * Members of a tenant that have a permission, ordered by user id. The cursor is the last id of
 * the page: ids are UUIDv7 and fit in the cursor alphabet, so they do not need encoding.
 */
@Injectable()
export class ListMembersByPermission {
  private readonly calculator = new EffectiveAccessCalculator();

  constructor(
    private readonly tenantAccess: TenantAccessRepository,
    private readonly scopes: ShardScopes,
  ) {}

  /**
   * Lists the members of a tenant that hold a permission, one page at a time.
   * @param input Tenant, permission, cursor and page size.
   * @returns One page of members.
   */
  async execute(input: ListMembersByPermissionInput): Promise<UserRefPage> {
    const limit = input.limit ?? Pagination.defaultLimit;
    const holders = await this.scopes.inTenantShard(
      input.tenantId,
      async () => {
        const groups = await this.tenantAccess.listGroups();
        const roles = await this.tenantAccess.listRoles();
        return (await this.tenantAccess.listMemberships()).filter(
          (membership) =>
            this.calculator
              .calculate(membership, groups, roles)
              .permissions.includes(input.permission),
        );
      },
    );
    const after = input.after;
    const remaining = holders
      .filter((membership) => after === undefined || membership.userId > after)
      .sort((a, b) => (a.userId < b.userId ? -1 : 1));
    const page = remaining.slice(0, limit);
    const last = page.at(-1);
    return {
      items: page.map((membership) => ({
        userId: membership.userId,
        homeTenantId: membership.homeTenantId,
      })),
      nextCursor:
        remaining.length > limit && last !== undefined ? last.userId : null,
    };
  }
}
