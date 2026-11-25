import type { JsonSafetyChecker } from './json-safety-checker.js';
import type { OperationResolver } from './operation-resolver.js';

export interface ContractRegistryOptions {
  /**
   * Cap of the default budget of a call (`OperationMetadata.callBudgetMs`:
   * all attempts plus the longest waits). Defaults to 25 000 ms, the
   * default budget of a saga step.
   */
  readonly maxCallBudgetMs?: number;
  /** Descriptor resolver. By default, one owned by the registry. */
  readonly resolver?: OperationResolver;
  /** JSON-safe schema checker. By default, the standard one. */
  readonly jsonSafety?: JsonSafetyChecker;
}
