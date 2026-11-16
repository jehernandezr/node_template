import type { UserAccess } from '@contracts/identity';
import type { UserRef } from '../../../shared/types/user-ref.type.js';

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
}
