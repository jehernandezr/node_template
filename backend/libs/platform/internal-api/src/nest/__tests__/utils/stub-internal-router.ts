import { CallOutcome, type CallOutcome as Outcome } from '@platform/primitives';
import { OperationResolver } from '../../../contract/operation-resolver.js';
import { InternalRouter } from '../../../server/internal-router.js';
import type { CallMeta } from '../../../transport/call-meta.js';

/** Call received by the test router. */
export interface RouterCall {
  readonly operationId: string;
  readonly input: unknown;
  readonly meta: CallMeta;
}

/** Test router that records the calls and responds with what was programmed. */
export class StubInternalRouter extends InternalRouter {
  readonly calls: RouterCall[] = [];
  private result: Outcome<unknown> = CallOutcome.success(null);

  constructor() {
    // The router constructor only stores its dependencies, which this double does not use.
    super(
      new OperationResolver(),
      undefined as never,
      undefined as never,
      undefined as never,
    );
  }

  /** Sets the result the next call returns. */
  respondWith(outcome: Outcome<unknown>): void {
    this.result = outcome;
  }

  override handle(
    operationId: string,
    rawInput: unknown,
    meta: CallMeta,
  ): Promise<Outcome<unknown>> {
    this.calls.push({ operationId, input: rawInput, meta });
    return Promise.resolve(this.result);
  }
}
