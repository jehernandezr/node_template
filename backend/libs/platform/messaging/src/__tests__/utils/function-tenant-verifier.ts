import { TenantVerifier } from '../../dispatch/tenant-verifier.js';
import type { MessageEnvelope } from '../../envelope/message-envelope.js';

/** Verificador de tenants de prueba cuya decisión sale de una función. */
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
