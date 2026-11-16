import type { CallOutcome } from '@platform/primitives';
import type { InternalRouter } from '../server/internal-router.js';
import type { CallMeta } from './call-meta.js';
import { Transport } from './transport.js';

/** Transporte que llama a un `InternalRouter` del mismo proceso. */
export class InProcessTransport extends Transport {
  constructor(private readonly router: InternalRouter) {
    super();
  }

  invoke(
    operationId: string,
    input: unknown,
    meta: CallMeta,
  ): Promise<CallOutcome<unknown>> {
    return this.router.handle(operationId, input, meta);
  }
}
