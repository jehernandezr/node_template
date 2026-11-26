import type { RandomSource } from '@platform/kernel';
import {
  Redactor,
  TraceContextRestorer,
  Tracing,
} from '@platform/observability';
import { FailureClassifier } from '@platform/primitives';
import type { MessageDispatcherParts } from '../../dispatch/message-dispatcher-options.js';

/** Complete `MessageDispatcherParts` for tests: tracing without an SDK and a classifier without rules. */
export class TestDispatcherParts {
  /** Returns the parts with `random` as the source of the retry jitter. */
  static with(random: RandomSource): MessageDispatcherParts {
    const tracing = new Tracing(new Redactor());
    return {
      random,
      tracing,
      restorer: new TraceContextRestorer(tracing),
      failures: new FailureClassifier(),
    };
  }
}
