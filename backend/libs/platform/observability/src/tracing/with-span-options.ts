import type { Attributes, SpanKind } from '@opentelemetry/api';

export interface WithSpanOptions {
  readonly kind?: SpanKind;
  /** Atributos iniciales. Sin secretos ni datos personales. */
  readonly attributes?: Attributes;
}
