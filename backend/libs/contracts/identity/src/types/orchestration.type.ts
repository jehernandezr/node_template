import type { Page, UserRef } from '@contracts/platform';
import type { ClientPlatform } from '../enums/auth.enum.js';
import type { Permission } from '../enums/access.enum.js';
import type {
  IdentitySaga,
  IdentitySagaStatus,
} from '../enums/identifiers.enum.js';

/** Respuesta 202 de `POST /v1/tenants`: el tenant se aprovisiona en una saga. */
export interface TenantCreation {
  tenantId: string;
  sagaId: string;
}

/** Respuesta 202 de `POST /v1/me/deletion`. */
export interface AccountDeletionStarted {
  sagaId: string;
}

/** Consulta de una saga propia. */
export interface GetSagaRequest {
  sagaId: string;
}

/** Estado de una saga de identity. */
export interface SagaSummary {
  sagaId: string;
  saga: IdentitySaga;
  status: IdentitySagaStatus;
  startedAt: string;
  /** Instante en que terminó; null mientras corre. */
  finishedAt: string | null;
}

/** Borra los datos personales de un usuario. */
export interface EraseUserInput {
  userId: string;
}

export interface EraseUserResult {
  userId: string;
  /** Instante en que quedó borrado. */
  erasedAt: string;
}

/** Usuario cuyos dispositivos con push se piden. */
export interface ListPushTargetsInput {
  user: UserRef;
}

/** Dispositivo al que se puede enviar un push. */
export interface PushTarget {
  deviceId: string;
  platform: ClientPlatform;
  pushToken: string;
}

export interface PushTargets {
  targets: PushTarget[];
}

/** Miembros de un tenant que tienen un permiso. */
export interface ListMembersByPermissionInput {
  tenantId: string;
  permission: Permission;
  limit?: number;
  after?: string;
}

export type UserRefPage = Page<UserRef>;

/** Payload de `identity.user.erased.v1`. */
export interface UserErasedPayload {
  userId: string;
  homeTenantId: string;
  erasedAt: string;
}
