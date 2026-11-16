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
 * Lado servidor de la API interna: tabla de operaciones con su handler.
 * Atiende cada llamada en un span de servidor que continúa la traza de
 * `CallMeta.traceparent` (la llaman otros servicios de la plataforma, así que
 * su `traceparent` es de confianza) y la entrega a `OperationDispatcher`.
 */
export class InternalRouter {
  private readonly routes = new Map<string, OperationRoute>();

  constructor(
    private readonly resolver: OperationResolver,
    private readonly dispatcher: OperationDispatcher,
    private readonly tracing: Tracing,
    private readonly restorer: TraceContextRestorer,
  ) {}

  /**
   * Une un handler con una operación declarada con `defineOperation`.
   * @throws InternalApiError `InvalidOperation` para cualquier otro valor y
   *   `DuplicateOperation` si la operación ya tiene handler.
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
  }

  /** @throws InternalApiError `MissingHandler` con todas las operaciones del registro que no tienen handler. */
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
   * Atiende una llamada. Operación desconocida: `protocol-violation` `unknown-operation`.
   * Si no, la corre `dispatcher.dispatch` dentro de un span de servidor con los
   * atributos de `InternalApiSpanAttribute`.
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
              : await this.dispatcher.dispatch(route, rawInput, meta);
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
   * Contexto en el que corre una llamada. Si el transporte ya continuó esa
   * traza (hay un span activo con el mismo traceId), se conserva el activo.
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
