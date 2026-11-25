import { TenantVerifier } from '../../tenant-verifier.js';
import type { MessageEnvelope } from '../../../envelope/message-envelope.js';

/** A query received by the verifier. */
export interface TenantVerification {
  readonly tenantId: string | undefined;
  readonly envelope: MessageEnvelope;
}

/** Verifier that records its queries and answers as configured: yes, no or an error. */
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
