import type { DispatchResult } from './dispatch-result.js';

/** Cómo terminó el intento de tomar un mensaje. */
export enum ClaimOutcomeKind {
  /** El claim es nuestro: hay que correr el manejador. */
  Acquired = 'acquired',
  /** El claim decidió el resultado sin correr el manejador. */
  Settled = 'settled',
}

/** Claim vigente de un mensaje, con lo necesario para completarlo o liberarlo. */
export interface AcquiredMessageClaim {
  readonly key: string;
  readonly token: string;
}

/** Resultado de `ClaimGuard.claim`. */
export type ClaimOutcome =
  | {
      readonly kind: ClaimOutcomeKind.Acquired;
      readonly claim: AcquiredMessageClaim;
    }
  | {
      readonly kind: ClaimOutcomeKind.Settled;
      readonly result: DispatchResult;
    };
