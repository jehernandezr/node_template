import { SagaDefinition } from '../../../definition/saga-definition.js';
import type { SagaFlow } from '../../../definition/saga-flow.js';
import { STEP_A, STEP_B, STEP_C } from './sample-operations.js';
import type { SampleState } from './sample-state.js';

/**
 * Saga cuyas entradas se construyen con código contado y no repetible: si el
 * motor reconstruyera una entrada en lugar de reutilizar la guardada, el
 * contador lo delataría.
 */
export class VolatileSaga extends SagaDefinition<SampleState> {
  readonly type = 'volatile';
  readonly counts = { inputs: 0, compensations: 0 };

  protected define(flow: SagaFlow<SampleState>): void {
    flow
      .step(STEP_A)
      .input(() => ({ name: 'a' }))
      .onSuccess((s, out) => {
        s.a = out.id;
      })
      .compensationInput((s) => ({ id: s.a }))
      .step(STEP_B)
      .input(() => {
        this.counts.inputs += 1;
        return { name: 'b', seq: this.counts.inputs };
      })
      .onSuccess((s, out) => {
        s.b = out.id;
      })
      .compensationInput((s) => {
        this.counts.compensations += 1;
        return { id: s.b, seq: this.counts.compensations };
      })
      .step(STEP_C)
      .input(() => ({ name: 'c' }))
      .onSuccess((s, out) => {
        s.c = out.id;
      })
      .compensationInput((s) => ({ id: s.c }));
  }
}
