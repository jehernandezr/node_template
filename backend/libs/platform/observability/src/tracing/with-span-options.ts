import type { Attributes, SpanKind } from '@opentelemetry/api';

export interface WithSpanOptions {
  readonly kind?: SpanKind;
  /** Initial attributes. No secrets or personal data. */
  readonly attributes?: Attributes;
}
