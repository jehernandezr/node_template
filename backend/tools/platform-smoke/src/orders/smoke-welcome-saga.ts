import { SagaDefinition, type SagaFlow } from '@platform/saga';
import { SmokeOperations } from './smoke-operations.js';

/** Estado de la saga de bienvenida. `failVerify` pide que el segundo paso falle, para probar la compensación. */
export interface SmokeWelcomeState {
  readonly orderId: string;
  readonly failVerify: boolean;
}

/** Reserva el stock y verifica el pago; si la verificación falla, libera la reserva. */
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
