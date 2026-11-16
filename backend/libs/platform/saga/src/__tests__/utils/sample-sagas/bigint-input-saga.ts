import { SagaDefinition } from '../../../definition/saga-definition.js';
import type { SagaFlow } from '../../../definition/saga-flow.js';
import { LOOSE_A } from './sample-operations.js';
import type { SampleState } from './sample-state.js';

/** Un paso cuya entrada no se puede guardar: un bigint, que JSON no tiene. */
export class BigIntInputSaga extends SagaDefinition<SampleState> {
  readonly type = 'input-bigint';

  protected define(flow: SagaFlow<SampleState>): void {
    flow.step(LOOSE_A).input(() => ({ big: BigInt(1) }));
  }
}
