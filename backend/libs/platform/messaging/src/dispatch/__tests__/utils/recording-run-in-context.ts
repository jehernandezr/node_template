import type { MessageEnvelope } from '../../../envelope/message-envelope.js';

/** Contexto de ejecución de prueba que anota cuándo entra y sale, y dice si hay una entrega adentro. */
export class RecordingRunInContext {
  readonly events: string[] = [];
  private depth = 0;

  get active(): boolean {
    return this.depth > 0;
  }

  run = async (
    envelope: MessageEnvelope,
    fn: () => Promise<void>,
  ): Promise<void> => {
    this.events.push(`enter:${envelope.type}`);
    this.depth += 1;
    try {
      await fn();
    } finally {
      this.depth -= 1;
    }
    this.events.push('exit');
  };
}
