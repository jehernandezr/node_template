import { SagaDefinition } from '../../../definition/saga-definition.js';
import type { SagaFlow } from '../../../definition/saga-flow.js';
import { LOOKUP, STEP_A, STEP_C } from './sample-operations.js';
import type { SampleState } from './sample-state.js';

/** A read-only step between two writes: when undoing, it is skipped. */
export class LookupSaga extends SagaDefinition<SampleState> {
  readonly type = 'with-lookup';

  protected define(flow: SagaFlow<SampleState>): void {
    flow
      .step(STEP_A)
      .input(() => ({ name: 'a' }))
      .onSuccess((s, out) => {
        s.a = out.id;
      })
      .compensationInput((s) => ({ id: s.a }))
      .step(LOOKUP)
      .input(() => ({}))
      .step(STEP_C)
      .input(() => ({ name: 'c' }));
  }
}
