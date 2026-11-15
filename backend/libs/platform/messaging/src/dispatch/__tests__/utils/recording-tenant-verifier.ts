import { TenantVerifier } from '../../tenant-verifier.js';
import type { MessageEnvelope } from '../../../envelope/message-envelope.js';

/** Una consulta recibida por el verificador. */
export interface TenantVerification {
  readonly tenantId: string | undefined;
  readonly envelope: MessageEnvelope;
}

/** Verificador que anota sus consultas y responde lo configurado: sí, no o un error. */
export class RecordingTenantVerifier extends TenantVerifier {
  readonly calls: TenantVerification[] = [];

  constructor(private readonly answer: boolean | Error = true) {
    super();
  }

  async verify(
    tenantId: string | undefined,
    envelope: MessageEnvelope,
  ): Promise<boolean> {
    this.calls.push({ tenantId, envelope });
    if (this.answer instanceof Error) {
      throw this.answer;
    }
    return this.answer;
  }
}
