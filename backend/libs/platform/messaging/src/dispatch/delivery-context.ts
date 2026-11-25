import type { MessageEnvelope } from '../envelope/message-envelope.js';

/**
 * Opens the context in which a delivery runs: the idempotency claim, the handler and the `complete`. A
 * sharded service uses it to set the shard and the tenant of the envelope, because the claim lives in the
 * tenant database and outside a context it would not know which shard to go to.
 */
export abstract class DeliveryContext {
  abstract run(
    envelope: MessageEnvelope,
    fn: () => Promise<void>,
  ): Promise<void>;
}
