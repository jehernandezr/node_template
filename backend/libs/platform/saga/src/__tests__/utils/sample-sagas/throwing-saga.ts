import { SagaDefinition } from '../../../definition/saga-definition.js';
import type { SagaFlow } from '../../../definition/saga-flow.js';
import { STEP_A } from './sample-operations.js';
import type { SampleState } from './sample-state.js';

/** Its state rule throws after a successful operation. */
export class ThrowingSaga extends SagaDefinition<SampleState> {
  readonly type = 'throwing';

  protected define(flow: SagaFlow<SampleState>): void {
    flow
      .step(STEP_A)
      .input(() => ({ name: 'a' }))
      .onSuccess(() => {
        throw new Error('state rule failed');
      })
      .compensationInput((s) => ({ id: s.a }));
  }
}
