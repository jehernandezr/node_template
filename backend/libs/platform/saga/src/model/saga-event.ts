import type { SagaEventKind } from './saga-event-kind.enum.js';

/** Event that the engine emits. */
export interface SagaEvent {
  readonly kind: SagaEventKind;
  readonly sagaId: string;
  readonly type: string;
  readonly lastErrorCode: string | null;
}

/** Listener of engine events. Errors it throws or rejects with are ignored. */
export type SagaEventListener = (event: SagaEvent) => void | Promise<void>;
