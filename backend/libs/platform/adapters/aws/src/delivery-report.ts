import type { DispatchOutcome, DispatchResult } from '@platform/messaging';
import type { DeliveryAction } from './delivery-action.enum.js';

/** Result of a delivery. `result` is missing if it was not dispatched (stopped FIFO). */
export interface DeliveryReport {
  readonly messageId: string;
  readonly action: DeliveryAction;
  readonly result?: DispatchResult;
}

/** Count of one `SqsPoller.pollOnce` pass. */
export interface PollReport {
  readonly received: number;
  readonly acknowledged: number;
  readonly redelivered: number;
}

/** Result of the dispatcher that sends a message to the DLQ. */
export type DeadLetterResult = Extract<
  DispatchResult,
  { outcome: DispatchOutcome.DeadLetter }
>;
