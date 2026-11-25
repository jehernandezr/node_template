import { TenantVerifier } from '../../dispatch/tenant-verifier.js';
import type { MessageEnvelope } from '../../envelope/message-envelope.js';

/** Test tenant verifier whose decision comes from a function. */
export class FunctionTenantVerifier extends TenantVerifier {
  constructor(
    private readonly decide: (
      tenantId: string | undefined,
      envelope: MessageEnvelope,
    ) => boolean | Promise<boolean>,
  ) {
    super();
  }

  async verify(
    tenantId: string | undefined,
    envelope: MessageEnvelope,
  ): Promise<boolean> {
    return this.decide(tenantId, envelope);
  }
}
