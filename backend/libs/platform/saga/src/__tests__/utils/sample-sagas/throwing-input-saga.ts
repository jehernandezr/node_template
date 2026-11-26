import { SagaDefinition } from '../../../definition/saga-definition.js';
import type { SagaFlow } from '../../../definition/saga-flow.js';
import { LOOSE_A } from './sample-operations.js';
import type { SampleState } from './sample-state.js';

/** A step whose input throws when built. */
export class ThrowingInputSaga extends SagaDefinition<SampleState> {
  readonly type = 'input-throws';

  protected override define(flow: SagaFlow<SampleState>): void {
    flow.step(LOOSE_A).input(() => {
      throw new Error('cannot build');
    });
  }
}
