import { SagaDefinition } from '../../../definition/saga-definition.js';
import type { SagaFlow } from '../../../definition/saga-flow.js';
import { STEP_A } from './sample-operations.js';
import type { SampleState } from './sample-state.js';

/** Su regla de estado deja una fecha en el estado: no sobrevive a JSON. */
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
