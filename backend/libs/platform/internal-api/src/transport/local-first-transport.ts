import type { CallOutcome } from '@platform/primitives';
import type { CallMeta } from './call-meta.js';
import { Transport } from './transport.js';

/**
 * Las operaciones del propio servicio van por el router del proceso y las de los demás, por la red. Así un
 * servicio que orquesta sus propias operaciones en una saga no necesita su URL ni se llama a sí mismo por HTTP.
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
