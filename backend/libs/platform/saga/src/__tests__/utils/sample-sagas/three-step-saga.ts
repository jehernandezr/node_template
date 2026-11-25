import { SagaDefinition } from '../../../definition/saga-definition.js';
import type { SagaFlow } from '../../../definition/saga-flow.js';
import { STEP_A, STEP_B, STEP_C } from './sample-operations.js';
import type { SampleState } from './sample-state.js';

/** Three steps that create resources and are undone in reverse order. */
export class ThreeStepSaga extends SagaDefinition<SampleState> {
  readonly type = 'three-step';

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
      .onSuccess((s, out) => {
        s.b = out.id;
        s.bAt = out.at;
      })
      .compensationInput((s) => ({ id: s.b }))
      .step(STEP_C)
      .input(() => ({ name: 'c' }))
      .onSuccess((s, out) => {
        s.c = out.id;
      })
      .compensationInput((s) => ({ id: s.c }));
  }
}
