import type { CallOutcome } from '@platform/primitives';
import type { InternalRouter } from '../server/internal-router.js';
import type { CallMeta } from './call-meta.js';
import { Transport } from './transport.js';

/** Transport that calls an `InternalRouter` in the same process. */
export class InProcessTransport extends Transport {
  constructor(private readonly router: InternalRouter) {
    super();
  }

  override invoke(
    operationId: string,
    input: unknown,
    meta: CallMeta,
  ): Promise<CallOutcome<unknown>> {
    return this.router.handle(operationId, input, meta);
  }
}
