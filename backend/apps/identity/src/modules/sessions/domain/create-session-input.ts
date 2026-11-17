import type { AuthMethodReference } from '@contracts/identity';
import type { ClientInfo } from '../../../shared/types/client-info.type.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';

/** Datos con los que `SessionsFacade.createSession` abre una sesión. */
export interface CreateSessionInput {
  readonly user: UserRef;
  /** Tenant activo. Sin valor, el último usado o el predeterminado (`AccessFacade.defaultTenant`). */
  readonly tenantId?: string;
  readonly deviceId?: string;
  readonly authMethods: readonly AuthMethodReference[];
  readonly authTime: Date;
  /** Instante del segundo factor si el inicio de sesión lo pidió. */
  readonly mfaVerifiedAt?: Date;
  readonly client: ClientInfo;
}
