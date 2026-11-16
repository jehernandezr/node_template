import type { ContractRegistry } from '@platform/internal-api';
import type { CallOutcome } from '@platform/primitives';
import type { InvokeOptions } from './invoke-options.js';

/**
 * Puerto que llama a una operación de otro servicio. Los reintentos dentro
 * del presupuesto del paso son de la implementación; la saga reacciona al
 * resultado final. Un error lanzado se clasifica con `FailureClassifier`.
 */
export abstract class OperationInvoker {
  /**
   * Operaciones que este invocador puede llamar. Cuando existe, el registro de
   * sagas valida las suyas contra ellas al arrancar.
   */
  get contracts(): ContractRegistry | undefined {
    return undefined;
  }

  /** Llama a `operationId` con `idempotencyKey`, que el participante debe respetar. */
  abstract invoke(
    operationId: string,
    input: unknown,
    idempotencyKey: string,
    options?: InvokeOptions,
  ): Promise<CallOutcome<unknown>>;
}
