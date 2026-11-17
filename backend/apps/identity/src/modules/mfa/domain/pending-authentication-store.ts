import type { PendingAuthentication } from '../../../shared/types/pending-authentication.type.js';

/** Autenticaciones que esperan un segundo factor. Viven diez minutos y se leen con el `mfaToken`. */
export abstract class PendingAuthenticationStore {
  /** Guarda y devuelve el `mfaToken` que viaja al cliente. */
  abstract save(pending: PendingAuthentication): Promise<string>;
  abstract find(mfaToken: string): Promise<PendingAuthentication | undefined>;
  /** Consume el token: una segunda verificación con el mismo token falla. */
  abstract consume(
    mfaToken: string,
  ): Promise<PendingAuthentication | undefined>;
}
