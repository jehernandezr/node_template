import type { InternalRouter } from './router.js';
import type { OperationResult } from './result.js';
import type { CallMeta, Transport } from './transport.js';

/** Transport that calls an `InternalRouter` in the same process. */
export class InProcessTransport implements Transport {
  private readonly router: InternalRouter;

  constructor(router: InternalRouter) {
    this.router = router;
  }

  invoke(
    operationId: string,
    input: unknown,
    meta: CallMeta,
  ): Promise<OperationResult<unknown>> {
    return this.router.handle(operationId, input, meta);
  }
}
