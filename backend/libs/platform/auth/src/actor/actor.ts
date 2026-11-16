import type { ActorType } from '@platform/observability';
import type {
  AuthMethodReference,
  Permission,
  PlatformRole,
  TokenAudience,
} from '@contracts/identity';

/** Usuario autenticado con un access token. Todos los instantes son epoch en segundos. */
export interface UserActor {
  readonly kind: ActorType.User;
  readonly userId: string;
  /** Tenant activo de la sesión. */
  readonly tenantId: string;
  /** Tenant de origen del usuario: con él se enruta su shard. */
  readonly homeTenantId: string;
  readonly sessionId: string;
  readonly deviceId?: string;
  readonly audience: TokenAudience;
  readonly authMethods: readonly AuthMethodReference[];
  readonly authTime: number;
  readonly roles: readonly string[];
  readonly platformRoles: readonly PlatformRole[];
  /** `<versión del tenant>.<versión del usuario>` tal como viene en el token. */
  readonly permissionVersion: string;
  readonly region: string;
  readonly sessionExpiresAt: number;
  readonly tokenId: string;
}

/** Service account autenticada con una API key. */
export interface ServiceAccountActor {
  readonly kind: ActorType.ServiceAccount;
  readonly serviceAccountId: string;
  readonly apiKeyId: string;
  readonly tenantId: string;
  readonly permissions: readonly Permission[];
}

/** El propio sistema: jobs y llamadas internas. No cumple ningún requisito de acceso de una ruta. */
export interface SystemActor {
  readonly kind: ActorType.System;
  readonly name: string;
}

export type Actor = UserActor | ServiceAccountActor | SystemActor;
