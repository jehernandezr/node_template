import {
  SpanKind,
  SpanStatusCode,
  trace,
  type Attributes,
  type Span,
  type Tracer,
} from '@opentelemetry/api';
import { redactString } from './redaction.js';

/** Nombre del instrumentation scope de los spans propios de la plataforma. */
export const OTEL_TRACER_SCOPE = '@platform/observability';

/** Atributos de span que agrega la plataforma. */
export enum SpanAttribute {
  /** Tipo de error (semconv `error.type`): el código de la plataforma o el nombre del error. */
  ErrorType = 'error.type',
  /** Código `SERVICIO.SUBMÓDULO.ERROR` del error. */
  ErrorCode = 'error.code',
  /** Trace id del `traceparent` de un cliente externo (ver `ExternalTraceparentPropagator`). */
  ExternalTraceId = 'platform.external_trace_id',
}

export interface WithSpanOptions {
  readonly kind?: SpanKind;
  /** Atributos iniciales. Sin secretos ni datos personales. */
  readonly attributes?: Attributes;
  /** Tracer a usar. Por defecto, el de la plataforma registrado globalmente. */
  readonly tracer?: Tracer;
}

/** Tracer de la plataforma. Sin SDK registrado es un no-op. */
export function platformTracer(): Tracer {
  return trace.getTracer(OTEL_TRACER_SCOPE);
}

/**
 * Marca el span con el error: estado `ERROR`, `error.type`, `error.code` y un
 * evento de excepción con mensaje y stack redactados. El mensaje de estado es
 * el código o el nombre, nunca el texto del error.
 */
export function recordSpanError(span: Span, error: unknown): void {
  const code =
    typeof error === 'object' && error !== null
      ? (error as { code?: unknown }).code
      : undefined;
  const name =
    error instanceof Error
      ? error.name
      : typeof error === 'string'
        ? 'Error'
        : typeof error;
  const type = typeof code === 'string' && code.length > 0 ? code : name;
  span.setAttribute(SpanAttribute.ErrorType, type);
  if (typeof code === 'string' && code.length > 0) {
    span.setAttribute(SpanAttribute.ErrorCode, code);
  }
  span.recordException({
    name,
    message:
      error instanceof Error
        ? redactString(error.message)
        : redactString(String(error)),
    ...(error instanceof Error &&
      error.stack !== undefined && { stack: redactString(error.stack) }),
  });
  span.setStatus({ code: SpanStatusCode.ERROR, message: type });
}

/**
 * Ejecuta `fn` dentro de un span activo y lo cierra al terminar. Si `fn`
 * lanza o su promesa se rechaza, marca el span con el error y lo relanza.
 * Úsalo en casos de uso, pasos de saga, handlers de mensajes y jobs.
 *
 * ```ts
 * await withSpan('orders.create', async () => createOrder.execute(cmd));
 * ```
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => T | Promise<T>,
  options: WithSpanOptions = {},
): Promise<T> {
  const tracer = options.tracer ?? platformTracer();
  return tracer.startActiveSpan(
    name,
    { kind: options.kind ?? SpanKind.INTERNAL, attributes: options.attributes },
    async (span) => {
      try {
        return await fn(span);
      } catch (error) {
        recordSpanError(span, error);
        throw error;
      } finally {
        span.end();
      }
    },
  );
}
