import type { OperationDefinition } from '@contracts/platform';
import type { ForwardEntry } from './forward-entry.js';
import type { SagaFlow } from './saga-flow.js';
import type { StepDraft } from './step-draft.js';
import type { StepInputOf, StepOutputOf } from './step-types.js';

/**
 * Configura un paso. Los métodos devuelven el mismo objeto, así la cadena
 * sigue con `.step()`, `.pivot()` o la siguiente llamada de configuración.
 */
export class StepConfig<TState, TIn, TOut> {
  constructor(
    private readonly flow: SagaFlow<TState>,
    private readonly draft: StepDraft<TState>,
  ) {}

  /** Construye la entrada de este paso desde el estado de la saga. Por defecto `undefined`. */
  input(fn: (state: TState) => TIn): this {
    this.draft.input = fn;
    return this;
  }

  /** Aplica la salida de este paso al estado de la saga. Recibe una copia normalizada. */
  onSuccess(fn: (state: TState, output: TOut) => void): this {
    // El motor entrega la salida normalizada por JSON que produjo el invocador.
    this.draft.onSuccess = fn as (state: TState, output: unknown) => void;
    return this;
  }

  /** Construye la entrada de la compensación. Por defecto, la entrada registrada hacia delante. */
  compensationInput(
    fn: (state: TState, forward: ForwardEntry) => unknown,
  ): this {
    this.draft.compensationInput = fn;
    return this;
  }

  /**
   * Motivos de `transient-failure` que dicen que el participante avanzó y pide otra llamada, como una ronda de copia
   * que no cupo en su plazo. El paso se repite sin gastar las suspensiones, que quedan para los fallos de verdad; antes
   * del pivote lo acota el plazo de la saga.
   */
  progressOn(...reasons: readonly string[]): this {
    this.draft.progressReasons = reasons;
    return this;
  }

  /** Agrega el siguiente paso, que llama a la operación de un contrato. */
  step<D extends OperationDefinition>(
    operation: D,
  ): StepConfig<TState, StepInputOf<D>, StepOutputOf<D>> {
    return this.flow.step(operation);
  }

  /** Marca la frontera: los pasos agregados después nunca se compensan. */
  pivot(): this {
    this.flow.markPivot();
    return this;
  }
}
