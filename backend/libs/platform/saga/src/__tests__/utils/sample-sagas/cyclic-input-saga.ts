import { SagaDefinition } from '../../../definition/saga-definition.js';
import type { SagaFlow } from '../../../definition/saga-flow.js';
import { LOOSE_A } from './sample-operations.js';
import type { SampleState } from './sample-state.js';

/** A step whose input has a cycle: it is not JSON. */
export class CyclicInputSaga extends SagaDefinition<SampleState> {
  readonly type = 'input-cycle';
  private readonly cycle: Record<string, unknown> = {};

  constructor() {
    super();
    this.cycle.self = this.cycle;
  }

  protected define(flow: SagaFlow<SampleState>): void {
    flow.step(LOOSE_A).input(() => this.cycle);
  }
}
