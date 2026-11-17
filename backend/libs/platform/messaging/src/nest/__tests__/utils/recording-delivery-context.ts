import { DeliveryContext } from '../../../dispatch/delivery-context.js';
import type { MessageEnvelope } from '../../../envelope/message-envelope.js';

/** Contexto de entrega de prueba: anota el tenant de cada sobre que envuelve. */
export class RecordingDeliveryContext extends DeliveryContext {
  readonly tenants: Array<string | undefined> = [];

  async run(envelope: MessageEnvelope, fn: () => Promise<void>): Promise<void> {
    this.tenants.push(envelope.tenantid);
    await fn();
  }
}
