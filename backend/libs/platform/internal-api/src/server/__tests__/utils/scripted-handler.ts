import type { OperationDefinition } from '@contracts/platform';
import { CallOutcome } from '@platform/primitives';
import type { CallMeta } from '../../../transport/call-meta.js';
import type {
  HandlerInputOf,
  OperationOutputOf,
} from '../../../contract/operation-io.type.js';
import type { HandlerResult } from '../../handler-result.js';
import { OperationHandler } from '../../operation-handler.js';

/** Un paso programado: devuelve un valor o lanza, y puede esperar una compuerta antes. */
interface ScriptedStep {
  readonly throws: boolean;
  readonly value?: unknown;
  readonly error?: unknown;
  readonly gate?: Promise<void>;
}

/**
 * Handler de prueba con pasos programados en orden; el último se repite. Cuenta
 * las llamadas y guarda la entrada y el `CallMeta` de cada una. El valor
 * devuelto no se valida aquí: así una prueba puede programar un resultado mal
 * formado a propósito.
 */
export class ScriptedHandler<
  S extends OperationDefinition = OperationDefinition,
> extends OperationHandler<S> {
  calls = 0;
  readonly inputs: unknown[] = [];
  readonly contexts: CallMeta[] = [];
  private readonly steps: ScriptedStep[] = [];

  /** Programa un resultado; `gate`, si se da, detiene el paso hasta que se resuelva. */
  thenReturn(result: unknown, gate?: Promise<void>): this {
    this.steps.push({ throws: false, value: result, gate });
    return this;
  }

  /** Programa un lanzamiento. */
  thenThrow(error: unknown): this {
    this.steps.push({ throws: true, error });
    return this;
  }

  override async handle(
    input: HandlerInputOf<S>,
    context: CallMeta,
  ): Promise<HandlerResult<OperationOutputOf<S>>> {
    this.calls += 1;
    this.inputs.push(input);
    this.contexts.push(context);
    const step: ScriptedStep | undefined =
      this.steps[Math.min(this.calls, this.steps.length) - 1];
    if (step?.gate !== undefined) {
      await step.gate;
    }
    if (step?.throws === true) {
      throw step.error;
    }
    const result: unknown = step?.value ?? { outcome: CallOutcome.success({}) };
    return result as HandlerResult<OperationOutputOf<S>>;
  }
}
