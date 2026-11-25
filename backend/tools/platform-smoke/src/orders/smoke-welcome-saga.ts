import { SagaDefinition, type SagaFlow } from '@platform/saga';
import { SmokeOperations } from './smoke-operations.js';

/** State of the welcome saga. `failVerify` asks for the second step to fail, to test compensation. */
export interface SmokeWelcomeState {
  readonly orderId: string;
  readonly failVerify: boolean;
}

/** Reserves the stock and verifies the payment; if the verification fails, releases the reservation. */
export class SmokeWelcomeSaga extends SagaDefinition<SmokeWelcomeState> {
  readonly type = 'smoke-welcome';

  protected define(flow: SagaFlow<SmokeWelcomeState>): void {
    flow
      .step(SmokeOperations.Reserve)
      .input((state) => ({ orderId: state.orderId }))
      .compensationInput((state) => ({ orderId: state.orderId }))
      .step(SmokeOperations.Verify)
      .input((state) => ({ orderId: state.orderId, fail: state.failVerify }));
  }
}
