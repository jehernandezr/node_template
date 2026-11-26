import { Redactor, TraceContextRestorer, Tracing } from '../../index.js';

/** Restorer whose active `traceparent` is fixed by the test instead of read from the active span. */
export class FixedTraceContextRestorer extends TraceContextRestorer {
  constructor(private readonly traceparent: string | undefined = undefined) {
    super(new Tracing(new Redactor()));
  }

  /** Returns the fixed `traceparent`, or `undefined` when the test set none. */
  override current(): string | undefined {
    return this.traceparent;
  }
}
