import { SagaDefinition } from '../../../definition/saga-definition.js';
import type { SagaFlow } from '../../../definition/saga-flow.js';
import { LOOSE_A } from './sample-operations.js';
import type { SampleState } from './sample-state.js';

/** A step whose input cannot be stored: a bigint, which JSON does not have. */
export class BigIntInputSaga extends SagaDefinition<SampleState> {
  readonly type = 'input-bigint';

  protected override define(flow: SagaFlow<SampleState>): void {
    flow.step(LOOSE_A).input(() => ({ big: BigInt(1) }));
  }
}
