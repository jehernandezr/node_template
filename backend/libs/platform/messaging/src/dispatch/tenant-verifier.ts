import type { MessageEnvelope } from '../envelope/message-envelope.js';

/**
 * Decides whether the envelope tenant is legitimate for this consumer, for example
 * that the tenant exists and is subscribed. `tenantId` is `undefined` when the
 * envelope carries none. If it throws, the dispatcher treats it as a transient failure.
 */
export abstract class TenantVerifier {
  abstract verify(
    tenantId: string | undefined,
    envelope: MessageEnvelope,
  ): Promise<boolean>;
}
