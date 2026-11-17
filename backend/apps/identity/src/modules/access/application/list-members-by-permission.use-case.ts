import { Injectable } from '@nestjs/common';
import { Pagination } from '@contracts/platform';
import type {
  ListMembersByPermissionInput,
  UserRefPage,
} from '@contracts/identity';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { TenantAccessRepository } from '../domain/access-store.js';
import { EffectiveAccessCalculator } from '../domain/effective-access-calculator.js';

/**
 * Miembros de un tenant que tienen un permiso, ordenados por id de usuario. El cursor es el último id de
 * la página: los ids son UUIDv7 y caben en el alfabeto del cursor, así que no hace falta codificarlos.
 */
@Injectable()
export class ListMembersByPermission {
  private readonly calculator = new EffectiveAccessCalculator();

  constructor(
    private readonly tenantAccess: TenantAccessRepository,
    private readonly scopes: IdentityShardScopes,
  ) {}

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
