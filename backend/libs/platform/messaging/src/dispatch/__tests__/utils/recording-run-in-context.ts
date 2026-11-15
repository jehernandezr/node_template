import type { MessageEnvelope } from '../../../envelope/message-envelope.js';

/** Contexto de ejecución de prueba que anota cuándo entra y sale. */
export class RecordingRunInContext {
  readonly events: string[] = [];

  run = async (
    envelope: MessageEnvelope,
    fn: () => Promise<void>,
  ): Promise<void> => {
    this.events.push(`enter:${envelope.type}`);
    await fn();
    this.events.push('exit');
  };
}
