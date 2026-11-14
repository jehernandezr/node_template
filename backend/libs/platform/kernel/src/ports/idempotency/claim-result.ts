import { ClaimState } from './claim-state.js';

export interface AcquiredClaim {
  readonly state: ClaimState.Acquired;
  /** Token de fencing. `complete` y `release` solo lo aceptan mientras sea el vigente. */
  readonly claimToken: string;
  /** Milisegundos epoch hasta los que nadie más puede tomar la llave. */
  readonly leaseUntil: number;
  /** Huella guardada con el primer claim; se compara con la de este intento. */
  readonly fingerprint: string;
  /** `true` si se tomó la llave porque el lease anterior venció. */
  readonly takeover: boolean;
}

export interface InProgressClaim {
  readonly state: ClaimState.InProgress;
  readonly leaseUntil: number;
  readonly fingerprint: string;
}

export interface CompletedClaim<R> {
  readonly state: ClaimState.Completed;
  readonly result: R;
  readonly fingerprint: string;
}

/** Resultado de `IdempotencyStore.claim`. */
export type ClaimResult<R> =
  AcquiredClaim | InProgressClaim | CompletedClaim<R>;
