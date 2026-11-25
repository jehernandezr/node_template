import { SagaDefinition } from '../../../definition/saga-definition.js';
import type { SagaFlow } from '../../../definition/saga-flow.js';
import { STEP_A, STEP_B } from './sample-operations.js';
import type { SampleState } from './sample-state.js';

/** Two steps; the second copies in rounds and returns `ProgressSaga.ROUND_PENDING` while it has more to do. */
export class ProgressSaga extends SagaDefinition<SampleState> {
  static readonly ROUND_PENDING = 'SAMPLE.COPY.ROUND_PENDING';
  readonly type = 'progress';

  protected define(flow: SagaFlow<SampleState>): void {
    flow
      .step(STEP_A)
      .input(() => ({ name: 'a' }))
      .onSuccess((s, out) => {
        s.a = out.id;
      })
      .compensationInput((s) => ({ id: s.a }))
      .step(STEP_B)
      .input(() => ({ name: 'b' }))
      .progressOn(ProgressSaga.ROUND_PENDING)
      .onSuccess((s, out) => {
        s.b = out.id;
      })
      .compensationInput((s) => ({ id: s.b }));
  }
}
