import { SagaDefinition } from '../../../definition/saga-definition.js';
import type { SagaFlow } from '../../../definition/saga-flow.js';
import { STEP_A } from './sample-operations.js';
import type { SampleState } from './sample-state.js';

/** Its state rule leaves a date in the state: it does not survive JSON. */
export class DateStateSaga extends SagaDefinition<SampleState> {
  readonly type = 'date-state';

  protected define(flow: SagaFlow<SampleState>): void {
    flow
      .step(STEP_A)
      .input(() => ({ name: 'a' }))
      .onSuccess((s) => {
        Object.assign(s, { when: new Date(0) });
      });
  }
}
