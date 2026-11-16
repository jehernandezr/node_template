import type { PendingMfa } from '@contracts/identity';
import type { StartPendingInput } from '../domain/start-pending-input.js';

/** Lo que `mfa` ofrece a los otros módulos. */
export abstract class MfaFacade {
  /** Guarda la autenticación pendiente y devuelve el `mfaToken` con los métodos que se ofrecen. */
  abstract startPending(input: StartPendingInput): Promise<PendingMfa>;
}
