import type {
  CallOptions,
  ContractRegistry,
  InternalClient,
} from '@platform/internal-api';
import type { CallOutcome } from '@platform/primitives';
import type { InvokeOptions, OperationInvoker } from './invoker.js';

/**
 * `OperationInvoker` backed by the `InternalClient` of `@platform/internal-api`.
 * Each step call carries the persisted context (tenant, actor, traceparent),
 * the step `Deadline` and its abort signal, so the client validates the input
 * against the contract, retries within the step budget and the server derives
 * its idempotency lease from the same deadline. It exposes the catalogue of
 * the client, so the engine validates its sagas against it at startup.
 */
export class InternalClientInvoker implements OperationInvoker {
  constructor(
    private readonly client: Pick<InternalClient, 'callById'> &
      Partial<Pick<InternalClient, 'contracts'>>,
  ) {}

  /** Catalogue of the client, used by `SagaEngine` to validate its sagas. */
  get contracts(): ContractRegistry | undefined {
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
