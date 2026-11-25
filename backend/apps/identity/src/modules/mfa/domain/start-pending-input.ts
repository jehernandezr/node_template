import type { AuthMethodReference } from '@contracts/identity';
import type { PendingPurpose } from '../../../shared/enums/pending-purpose.enum.js';
import type { ClientInfo } from '../../../shared/types/client-info.type.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';

/** Data with which `MfaFacade.startPending` opens a pending authentication. */
export interface StartPendingInput {
  readonly user: UserRef;
  readonly purpose: PendingPurpose;
  readonly client: ClientInfo;
  /** Methods already satisfied: the password in a sign-in, the session's methods in a step-up. */
  readonly authMethods: readonly AuthMethodReference[];
  readonly deviceId?: string;
  /** Session to elevate, only with `PendingPurpose.StepUp`. */
  readonly sessionId?: string;
}
