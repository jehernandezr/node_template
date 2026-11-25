import type { AuthMethodReference } from '@contracts/identity';
import type { ClientInfo } from '../../../shared/types/client-info.type.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';

/** Data with which `SessionsFacade.createSession` opens a session. */
export interface CreateSessionInput {
  readonly user: UserRef;
  /** Active tenant. When empty, the last used or the default one (`AccessFacade.defaultTenant`). */
  readonly tenantId?: string;
  readonly deviceId?: string;
  readonly authMethods: readonly AuthMethodReference[];
  readonly authTime: Date;
  /** Time of the second factor if the sign-in required it. */
  readonly mfaVerifiedAt?: Date;
  readonly client: ClientInfo;
}
