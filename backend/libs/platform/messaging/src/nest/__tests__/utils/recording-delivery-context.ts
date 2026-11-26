import { DeliveryContext } from '../../../dispatch/delivery-context.js';
import type { MessageEnvelope } from '../../../envelope/message-envelope.js';

/** Test delivery context: records the tenant of each envelope it wraps. */
export class RecordingDeliveryContext extends DeliveryContext {
  readonly tenants: Array<string | undefined> = [];

  override async run(
    envelope: MessageEnvelope,
    fn: () => Promise<void>,
  ): Promise<void> {
    this.tenants.push(envelope.tenantid);
    await fn();
  }
}
