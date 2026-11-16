import { SagaDefinition } from '../../../definition/saga-definition.js';
import type { SagaFlow } from '../../../definition/saga-flow.js';
import { LOOSE_A } from './sample-operations.js';
import type { SampleState } from './sample-state.js';

/** Un paso cuya entrada lanza al construirse. */
export class ThrowingInputSaga extends SagaDefinition<SampleState> {
  readonly type = 'input-throws';

  protected define(flow: SagaFlow<SampleState>): void {
    flow.step(LOOSE_A).input(() => {
      throw new Error('cannot build');
    });
  }
}
