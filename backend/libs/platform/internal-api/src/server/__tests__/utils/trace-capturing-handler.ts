import type { OperationDefinition } from '@contracts/platform';
import type { TraceContextRestorer } from '@platform/observability';
import type { CallOutcome } from '@platform/primitives';
import type { OperationOutputOf } from '../../../contract/operation-io.type.js';
import type { HandlerResult } from '../../handler-result.js';
import { OperationHandler } from '../../operation-handler.js';

/** Handler that stores the `traceparent` of the active span when it runs. */
export class TraceCapturingHandler<
  S extends OperationDefinition = OperationDefinition,
> extends OperationHandler<S> {
  seen: string | undefined = 'unset';

  constructor(
    private readonly restorer: TraceContextRestorer,
    private readonly outcome: CallOutcome<unknown>,
  ) {
    super();
  }

  override async handle(): Promise<HandlerResult<OperationOutputOf<S>>> {
    await Promise.resolve();
    this.seen = this.restorer.current();
    return { outcome: this.outcome as CallOutcome<OperationOutputOf<S>> };
  }
}
