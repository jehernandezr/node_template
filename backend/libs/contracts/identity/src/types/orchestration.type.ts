import type { Page, UserRef } from '@contracts/platform';
import type { ClientPlatform } from '../enums/auth.enum.js';
import type { Permission } from '../enums/access.enum.js';
import type {
  IdentitySaga,
  IdentitySagaStatus,
} from '../enums/identifiers.enum.js';

/** 202 response of `POST /v1/tenants`: the tenant is provisioned in a saga. */
export interface TenantCreation {
  tenantId: string;
  sagaId: string;
}

/** 202 response of `POST /v1/me/deletion`. */
export interface AccountDeletionStarted {
  sagaId: string;
}

/** Query of one's own saga. */
export interface GetSagaRequest {
  sagaId: string;
}

/** Status of an identity saga. */
export interface SagaSummary {
  sagaId: string;
  saga: IdentitySaga;
  status: IdentitySagaStatus;
  startedAt: string;
  /** Instant it finished; null while it runs. */
  finishedAt: string | null;
}

/** Deletes a user's personal data. */
export interface EraseUserInput {
  userId: string;
}

export interface EraseUserResult {
  userId: string;
  /** Instant it was deleted. */
  erasedAt: string;
}

/** User whose push-enabled devices are requested. */
export interface ListPushTargetsInput {
  user: UserRef;
}

/** Device a push can be sent to. */
export interface PushTarget {
  deviceId: string;
  platform: ClientPlatform;
  pushToken: string;
}

export interface PushTargets {
  targets: PushTarget[];
}

/** Members of a tenant that have a permission. */
export interface ListMembersByPermissionInput {
  tenantId: string;
  permission: Permission;
  limit?: number;
  after?: string;
}

export type UserRefPage = Page<UserRef>;

/** Payload of `identity.user.erased.v1`. */
export interface UserErasedPayload {
  userId: string;
  homeTenantId: string;
  erasedAt: string;
}
