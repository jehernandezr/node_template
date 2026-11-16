import type { DispatchOutcome, DispatchResult } from '@platform/messaging';
import type { DeliveryAction } from './delivery-action.enum.js';

/** Resultado de una entrega. `result` falta si no se despachó (FIFO detenido). */
export interface DeliveryReport {
  readonly messageId: string;
  readonly action: DeliveryAction;
  readonly result?: DispatchResult;
}

/** Conteo de una pasada de `SqsPoller.pollOnce`. */
export interface PollReport {
  readonly received: number;
  readonly acknowledged: number;
  readonly redelivered: number;
}

/** Resultado del despachador que manda un mensaje a la DLQ. */
export type DeadLetterResult = Extract<
  DispatchResult,
  { outcome: DispatchOutcome.DeadLetter }
>;
