import type {
  CallOptions,
  ContractRegistry,
  InternalClient,
} from '@platform/internal-api';
import type { CallOutcome } from '@platform/primitives';
import type { InvokeOptions } from './invoke-options.js';
import { OperationInvoker } from './operation-invoker.js';

/**
 * `OperationInvoker` respaldado por el `InternalClient` de `@platform/internal-api`.
 * Cada llamada de paso lleva el contexto guardado (tenant, actor, traceparent),
 * el `Deadline` del paso y su señal de aborto, así el cliente valida la entrada
 * contra el contrato, reintenta dentro del presupuesto y el servidor deriva su
 * lease de idempotencia del mismo plazo. Expone el catálogo del cliente, con el
 * que el registro de sagas las valida al arrancar.
 */
export class InternalClientInvoker extends OperationInvoker {
  constructor(
    private readonly client: Pick<InternalClient, 'callById'> &
      Partial<Pick<InternalClient, 'contracts'>>,
  ) {
    super();
  }

  override get contracts(): ContractRegistry | undefined {
    return this.client.contracts;
  }

  invoke(
    operationId: string,
    input: unknown,
    idempotencyKey: string,
    options: InvokeOptions = {},
  ): Promise<CallOutcome<unknown>> {
    const { context, deadline, signal } = options;
    const call: CallOptions = {
      idempotencyKey,
      ...(context?.tenantId !== undefined && { tenantId: context.tenantId }),
      ...(context?.actorId !== undefined && { actorId: context.actorId }),
      ...(context?.traceparent !== undefined && {
        traceparent: context.traceparent,
      }),
      ...(deadline !== undefined && { deadline }),
      ...(signal !== undefined && { signal }),
    };
    return this.client.callById(operationId, input, call);
  }
}
