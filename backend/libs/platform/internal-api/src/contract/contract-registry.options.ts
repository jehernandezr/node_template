import type { JsonSafetyChecker } from './json-safety-checker.js';
import type { OperationResolver } from './operation-resolver.js';

export interface ContractRegistryOptions {
  /**
   * Tope del presupuesto por defecto de una llamada (`OperationMetadata.callBudgetMs`:
   * todos los intentos más las esperas más largas). Por defecto 25 000 ms, el
   * presupuesto por defecto de un paso de saga.
   */
  readonly maxCallBudgetMs?: number;
  /** Resolvedor de descriptores. Por defecto, uno propio del registro. */
  readonly resolver?: OperationResolver;
  /** Verificador de esquemas seguros para JSON. Por defecto, el estándar. */
  readonly jsonSafety?: JsonSafetyChecker;
}
