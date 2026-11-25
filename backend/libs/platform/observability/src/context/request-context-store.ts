import { AsyncLocalStorage } from 'node:async_hooks';
import { TraceContextCodec } from '../propagation/trace-context-codec.js';
import { Tracing } from '../tracing/tracing.js';
import type { RequestContextData } from './request-context-data.js';
import type { RequestContextInit } from './request-context-init.js';

/**
 * Business context of each request, message or job: tenant, actor, region,
 * `externalTraceId` and the debug sample. It propagates across async
 * calls with a private `AsyncLocalStorage`.
 *
 * Trace ids are not duplicated: if there is an active OpenTelemetry span,
 * `current()` returns its `traceId` and `spanId`. The stored values are only
 * used when the SDK is off or there is no span (for example, in tests).
 * Without an open context it returns `undefined` even if there is a span: that way the
 * `RequestContextInterceptor` knows it must open one.
 */
export class RequestContextStore {
  private readonly storage = new AsyncLocalStorage<RequestContextData>();

  constructor(private readonly tracing: Tracing) {}

  /** Opens a context. Validates and normalizes the ids only once; never throws for malformed ids. */
  run<T>(init: RequestContextInit, fn: () => T): T {
    return this.storage.run(this.normalize(init), fn);
  }

  current(): RequestContextData | undefined {
    const stored = this.storage.getStore();
    if (stored === undefined) {
      return undefined;
    }
    const span = this.tracing.activeIds();
    if (span === undefined) {
      return stored;
    }
    // The active span carries a valid trace: the warning about the received value no longer applies.
    const withoutInvalidFlag = Object.fromEntries(
      Object.entries(stored).filter(([key]) => key !== 'traceIdInvalid'),
    ) as RequestContextData;
    return {
      ...withoutInvalidFlag,
      traceId: span.traceId,
      spanId: span.spanId,
    };
  }

  private normalize(init: RequestContextInit): RequestContextData {
    const traceId = TraceContextCodec.normalizeTraceId(init.traceId);
    const spanId = TraceContextCodec.normalizeSpanId(init.spanId);
    const externalTraceId = TraceContextCodec.normalizeTraceId(
      init.externalTraceId,
    );
    return {
      ...(traceId !== undefined && { traceId }),
      ...(traceId === undefined &&
        init.traceId !== undefined && { traceIdInvalid: true as const }),
      ...(spanId !== undefined && { spanId }),
      ...(externalTraceId !== undefined && { externalTraceId }),
      ...(init.tenantId !== undefined && { tenantId: init.tenantId }),
      ...(init.actorId !== undefined && { actorId: init.actorId }),
      ...(init.actorType !== undefined && { actorType: init.actorType }),
      ...(init.userId !== undefined && { userId: init.userId }),
      ...(init.region !== undefined && { region: init.region }),
      debugSampled: init.debugSampled === true,
    };
  }
}
