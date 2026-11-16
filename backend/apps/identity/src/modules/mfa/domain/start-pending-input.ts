import type { PendingPurpose } from '../../../shared/enums/pending-purpose.enum.js';
import type { ClientInfo } from '../../../shared/types/client-info.type.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';

/** Datos con los que `MfaFacade.startPending` abre una autenticación pendiente. */
export interface StartPendingInput {
  readonly user: UserRef;
  readonly purpose: PendingPurpose;
  readonly client: ClientInfo;
  readonly deviceId?: string;
  /** Sesión a elevar, solo con `PendingPurpose.StepUp`. */
  readonly sessionId?: string;
}
