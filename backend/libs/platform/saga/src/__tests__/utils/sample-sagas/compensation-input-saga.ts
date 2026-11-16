import { SagaDefinition } from '../../../definition/saga-definition.js';
import type { SagaFlow } from '../../../definition/saga-flow.js';
import { STEP_A, STEP_C } from './sample-operations.js';
import type { SampleState } from './sample-state.js';

/** Su constructor de entrada de compensación lanza: no hay referencia para deshacer. */
export class CompensationInputSaga extends SagaDefinition<SampleState> {
  readonly type = 'comp-input-throws';

  protected define(flow: SagaFlow<SampleState>): void {
    flow
      .step(STEP_A)
      .input(() => ({ name: 'a' }))
      .compensationInput(() => {
        throw new Error('no reference');
      })
      .step(STEP_C)
      .input(() => ({ name: 'c' }));
  }
}
