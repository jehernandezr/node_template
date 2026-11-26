import type {
  CallOptions,
  ContractRegistry,
  InternalClient,
} from '@platform/internal-api';
import type { CallOutcome } from '@platform/primitives';
import type { InvokeOptions } from './invoke-options.js';
import { OperationInvoker } from './operation-invoker.js';

/**
 * `OperationInvoker` backed by the `InternalClient` of `@platform/internal-api`.
 * Each step call carries the saved context (tenant, actor, traceparent),
 * the step `Deadline` and its abort signal, so the client validates the input
 * against the contract, retries within the budget and the server derives its
 * idempotency lease from the same deadline. Exposes the client catalog, which
 * the saga registry uses to validate sagas at startup.
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

  override invoke(
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
