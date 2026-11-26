import type { OperationDefinition } from '@contracts/platform';
import {
  context as otelContext,
  SpanKind,
  trace,
  type Context,
} from '@opentelemetry/api';
import {
  TraceContextCodec,
  type TraceContextRestorer,
  type Tracing,
} from '@platform/observability';
import { CallOutcome } from '@platform/primitives';
import type { ContractRegistry } from '../contract/contract-registry.js';
import type { OperationResolver } from '../contract/operation-resolver.js';
import { InternalApiReason } from '../contract/internal-api-reason.enum.js';
import { InternalApiError } from '../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import type { CallMeta } from '../transport/call-meta.js';
import {
  InternalApiRpcSystem,
  InternalApiSpanAttribute,
} from './internal-api-span-attribute.enum.js';
import type { OperationDispatcher } from './operation-dispatcher.js';
import type { OperationHandler } from './operation-handler.js';
import { OperationRoute } from './operation-route.js';

/**
 * Server side of the internal API: table of operations with their handler.
 * It serves each call in a server span that continues the trace from
 * `CallMeta.traceparent` (other platform services call it, so
 * its `traceparent` is trusted) and hands it to `OperationDispatcher`.
 */
export class InternalRouter {
  private readonly routes = new Map<string, OperationRoute>();
  private readonly undone = new Map<string, string[]>();

  constructor(
    private readonly resolver: OperationResolver,
    private readonly dispatcher: OperationDispatcher,
    private readonly tracing: Tracing,
    private readonly restorer: TraceContextRestorer,
  ) {}

  /**
   * Binds a handler to an operation declared with `defineOperation`.
   * @param operation Operation contract.
   * @param handler Handler.
   * @throws InternalApiError `InvalidOperation` for any other value and
   *   `DuplicateOperation` if the operation already has a handler.
   */
  register<S extends OperationDefinition>(
    operation: S,
    handler: OperationHandler<S>,
  ): void {
    const descriptor = this.resolver.resolve(operation);
    if (this.routes.has(descriptor.id)) {
      throw new InternalApiError(
        InternalApiErrorCode.DuplicateOperation,
        `A handler for "${descriptor.id}" is already registered`,
      );
    }
    this.routes.set(descriptor.id, OperationRoute.bind(descriptor, handler));
    const compensation = descriptor.metadata.compensation();
    if (compensation !== null) {
      this.undone.set(compensation, [
        ...(this.undone.get(compensation) ?? []),
        descriptor.id,
      ]);
    }
  }

  /**
   * Checks that every registered operation has a handler.
   * @param registry Contract registry.
   * @throws InternalApiError `MissingHandler` with every registry operation that has no handler.
   */
  assertComplete(registry: ContractRegistry): void {
    const missing = registry
      .operations()
      .map((entry) => entry.id)
      .filter((id) => !this.routes.has(id));
    if (missing.length > 0) {
      throw new InternalApiError(
        InternalApiErrorCode.MissingHandler,
        `Missing handlers for: ${missing.join(', ')}`,
      );
    }
  }

  /**
   * Handles a call. Unknown operation: `protocol-violation` `unknown-operation`.
   * Otherwise, `dispatcher.dispatch` runs it inside a server span with the
   * attributes of `InternalApiSpanAttribute`, with the registered operations this one compensates.
   * @param operationId Operation id.
   * @param rawInput Raw input.
   * @param meta Call metadata.
   * @returns The outcome.
   */
  handle(
    operationId: string,
    rawInput: unknown,
    meta: CallMeta,
  ): Promise<CallOutcome<unknown>> {
    return otelContext.with(this.traceContext(meta.traceparent), () =>
      this.tracing.withSpan(
        operationId,
        async (span) => {
          const route = this.routes.get(operationId);
          const outcome =
            route === undefined
              ? CallOutcome.protocolViolation(
                  InternalApiReason.UnknownOperation,
                  InternalApiErrorCode.UnknownOperation,
                )
              : await this.dispatcher.dispatch(
                  route,
                  rawInput,
                  meta,
                  this.undone.get(operationId) ?? [],
                );
          span.setAttribute(InternalApiSpanAttribute.Outcome, outcome.kind);
          return outcome;
        },
        {
          kind: SpanKind.SERVER,
          attributes: {
            [InternalApiSpanAttribute.RpcSystem]: InternalApiRpcSystem.Value,
            [InternalApiSpanAttribute.RpcMethod]: operationId,
          },
        },
      ),
    );
  }

  /**
   * Returns the context a call runs in. If the transport already continued that
   * trace (there is an active span with the same traceId), the active one is kept.
   */
  private traceContext(traceparent: string | undefined): Context {
    const active = otelContext.active();
    const incoming = TraceContextCodec.parseTraceparent(traceparent);
    if (incoming === null) {
      return active;
    }
    if (trace.getSpanContext(active)?.traceId === incoming.traceId) {
      return active;
    }
    return this.restorer.contextFrom(traceparent, active);
  }
}
