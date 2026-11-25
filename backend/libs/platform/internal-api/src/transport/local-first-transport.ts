import type { CallOutcome } from '@platform/primitives';
import type { CallMeta } from './call-meta.js';
import { Transport } from './transport.js';

/**
 * The service's own operations go through the process router and those of the others, over the network. This way a
 * service that orchestrates its own operations in a saga does not need its own URL nor calls itself over HTTP.
 */
export class LocalFirstTransport extends Transport {
  constructor(
    private readonly ownOperations: ReadonlySet<string>,
    private readonly local: Transport,
    private readonly remote: Transport,
  ) {
    super();
  }

  invoke(
    operationId: string,
    input: unknown,
    meta: CallMeta,
  ): Promise<CallOutcome<unknown>> {
    return this.ownOperations.has(operationId)
      ? this.local.invoke(operationId, input, meta)
      : this.remote.invoke(operationId, input, meta);
  }
}
