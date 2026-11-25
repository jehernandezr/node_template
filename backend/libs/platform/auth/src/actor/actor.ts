import type { ActorType } from '@platform/observability';
import type {
  AuthMethodReference,
  Permission,
  PlatformRole,
  TokenAudience,
} from '@contracts/identity';

/** User authenticated with an access token. All instants are epoch in seconds. */
export interface UserActor {
  readonly kind: ActorType.User;
  readonly userId: string;
  /** Active tenant of the session. */
  readonly tenantId: string;
  /** Home tenant of the user: its shard is routed with it. */
  readonly homeTenantId: string;
  readonly sessionId: string;
  readonly deviceId?: string;
  readonly audience: TokenAudience;
  readonly authMethods: readonly AuthMethodReference[];
  readonly authTime: number;
  readonly roles: readonly string[];
  readonly platformRoles: readonly PlatformRole[];
  /** `<tenant version>.<user version>` as it comes in the token. */
  readonly permissionVersion: string;
  readonly region: string;
  readonly sessionExpiresAt: number;
  readonly tokenId: string;
}

/** Service account authenticated with an API key. */
export interface ServiceAccountActor {
  readonly kind: ActorType.ServiceAccount;
  readonly serviceAccountId: string;
  readonly apiKeyId: string;
  readonly tenantId: string;
  readonly permissions: readonly Permission[];
}

/** The system itself: jobs and internal calls. It does not satisfy any access requirement of a route. */
export interface SystemActor {
  readonly kind: ActorType.System;
  readonly name: string;
}

export type Actor = UserActor | ServiceAccountActor | SystemActor;
