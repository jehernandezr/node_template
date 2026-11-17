import type { UserAccess } from '@contracts/identity';
import type { Actor } from '@platform/auth';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { UserTenant } from '../domain/user-tenant.js';

/** Lo que `access` ofrece a los otros módulos. */
export abstract class AccessFacade {
  /** Acceso efectivo del usuario en el tenant, con la versión de permisos. */
  abstract resolve(userId: string, tenantId: string): Promise<UserAccess>;
  abstract isMember(userId: string, tenantId: string): Promise<boolean>;
  /** Tenant en el que abre sesión un usuario sin sesión previa. */
  abstract defaultTenant(ref: UserRef): Promise<string>;
  /** Si el usuario es administrador de su tenant predeterminado y por eso necesita segundo factor en cada inicio de sesión. */
  abstract requiresMfaOnEveryLogin(
    ref: UserRef,
    tenantId: string,
  ): Promise<boolean>;
  abstract addMember(
    tenantId: string,
    ref: UserRef,
    groupIds: readonly string[],
  ): Promise<void>;
  /**
   * Los grupos existen en el tenant y no otorgan nada que el actor no tenga.
   * @throws IdentityError `PLATFORM.AUTH.FORBIDDEN` o `PLATFORM.RESOURCE.NOT_FOUND`.
   */
  abstract assertCanGrantGroups(
    tenantId: string,
    actor: Actor | undefined,
    groupIds: readonly string[],
  ): Promise<void>;
  /** Roles y grupos de sistema de un tenant nuevo y, si se indica, la membresía de su dueño. */
  abstract setupTenant(tenantId: string, owner?: UserRef): Promise<void>;
  /** Copia la membresía del usuario al shard del usuario; es idempotente. */
  abstract projectMembership(tenantId: string, ref: UserRef): Promise<void>;
  /** Tenants del usuario según su proyección `user_tenants`. */
  abstract tenantsOf(ref: UserRef): Promise<readonly UserTenant[]>;
}
