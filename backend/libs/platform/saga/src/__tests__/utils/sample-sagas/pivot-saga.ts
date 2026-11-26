import { SagaDefinition } from '../../../definition/saga-definition.js';
import type { SagaFlow } from '../../../definition/saga-flow.js';
import { SEND, STEP_A } from './sample-operations.js';
import type { SampleState } from './sample-state.js';

/** A compensable step before the pivot and a send that can no longer be undone. */
export class PivotSaga extends SagaDefinition<SampleState> {
  readonly type = 'pivot-saga';

  protected override define(flow: SagaFlow<SampleState>): void {
    flow
      .step(STEP_A)
      .input(() => ({ name: 'a' }))
      .onSuccess((s, out) => {
        s.a = out.id;
      })
      .compensationInput((s) => ({ id: s.a }))
      .pivot()
      .step(SEND)
      .input(() => ({ name: 'post' }))
      .onSuccess((s, out) => {
        s.post = out.id;
      });
  }
}
