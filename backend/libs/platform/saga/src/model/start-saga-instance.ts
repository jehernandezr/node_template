import type { SagaCallContext } from './saga-call-context.js';

/** Datos con los que `SagaInstance.start` crea una instancia nueva. */
export interface StartSagaInstance {
  readonly id: string;
  readonly type: string;
  readonly idempotencyKey: string | null;
  /** Estado inicial ya copiado con `SagaPayload.clone`. */
  readonly state: unknown;
  readonly inputDigest: string;
  /** Se guarda sin los campos `undefined`, o `null` si queda vacío. */
  readonly context: SagaCallContext | undefined;
  /** Token de la corrida que arranca la saga: nace con el lease tomado. */
  readonly leaseToken: string;
  readonly leaseUntil: Date;
  readonly deadlineAt: Date | null;
  readonly now: Date;
}
