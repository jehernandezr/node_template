import {
  TenantMoveManifest,
  TenantMoveSelectorKind,
  type TenantMoveTable,
} from '@platform/tenant-move';

/** The identity shard tables that travel with a tenant: the tenant's own and those of the users whose home tenant it is, which hang off `users`. */
export class IdentityTenantMoveManifest extends TenantMoveManifest {
  private static readonly TABLES: readonly TenantMoveTable[] = [
    {
      table: 'users',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'home_tenant_id',
      },
    },
    {
      table: 'password_credentials',
      selector: {
        kind: TenantMoveSelectorKind.ViaParent,
        parent: 'users',
        column: 'id',
        parentColumn: 'id',
      },
    },
    {
      table: 'password_resets',
      selector: {
        kind: TenantMoveSelectorKind.ViaParent,
        parent: 'users',
        column: 'user_id',
        parentColumn: 'id',
      },
    },
    {
      table: 'login_attempts',
      selector: {
        kind: TenantMoveSelectorKind.ViaParent,
        parent: 'users',
        column: 'user_id',
        parentColumn: 'id',
      },
    },
    {
      table: 'devices',
      selector: {
        kind: TenantMoveSelectorKind.ViaParent,
        parent: 'users',
        column: 'user_id',
        parentColumn: 'id',
      },
    },
    {
      table: 'totp_factors',
      selector: {
        kind: TenantMoveSelectorKind.ViaParent,
        parent: 'users',
        column: 'id',
        parentColumn: 'id',
      },
    },
    {
      table: 'recovery_codes',
      selector: {
        kind: TenantMoveSelectorKind.ViaParent,
        parent: 'users',
        column: 'user_id',
        parentColumn: 'id',
      },
    },
    {
      table: 'mfa_recoveries',
      selector: {
        kind: TenantMoveSelectorKind.ViaParent,
        parent: 'users',
        column: 'user_id',
        parentColumn: 'id',
      },
    },
    {
      table: 'passkeys',
      selector: {
        kind: TenantMoveSelectorKind.ViaParent,
        parent: 'users',
        column: 'user_id',
        parentColumn: 'id',
      },
    },
    {
      table: 'sessions',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'home_tenant_id',
      },
    },
    {
      table: 'user_tenants',
      selector: {
        kind: TenantMoveSelectorKind.ViaParent,
        parent: 'users',
        column: 'user_id',
        parentColumn: 'id',
      },
    },
    {
      table: 'platform_role_assignments',
      selector: {
        kind: TenantMoveSelectorKind.ViaParent,
        parent: 'users',
        column: 'user_id',
        parentColumn: 'id',
      },
    },
    {
      table: 'tenants',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
      regionColumn: 'region',
    },
    {
      table: 'roles',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
    {
      table: 'groups',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
    {
      table: 'tenant_members',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
    {
      table: 'tenant_access_versions',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
    {
      table: 'invitations',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
    {
      table: 'service_accounts',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
    {
      table: 'api_keys',
      selector: {
        kind: TenantMoveSelectorKind.TenantColumn,
        column: 'tenant_id',
      },
    },
  ];

  override tables(): readonly TenantMoveTable[] {
    return IdentityTenantMoveManifest.TABLES;
  }
}
