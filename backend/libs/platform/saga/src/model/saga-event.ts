import type { SagaEventKind } from './saga-event-kind.enum.js';

/** Evento que emite el motor. */
export interface SagaEvent {
  readonly kind: SagaEventKind;
  readonly sagaId: string;
  readonly type: string;
  readonly lastErrorCode: string | null;
}

/** Oyente de eventos del motor. Los errores que lance o con los que se rechace se ignoran. */
export type SagaEventListener = (event: SagaEvent) => void | Promise<void>;
