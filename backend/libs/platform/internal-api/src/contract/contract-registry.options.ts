import type { JsonSafetyChecker } from './json-safety-checker.js';
import type { OperationResolver } from './operation-resolver.js';

/** Collaborators of `ContractRegistry`. */
export interface ContractRegistryCollaborators {
  /** Turns a `defineOperation` value into its descriptor. */
  readonly resolver: OperationResolver;
  /** Rejects schemas that do not survive JSON transport. */
  readonly jsonSafety: JsonSafetyChecker;
}

/** Options of `ContractRegistry`. */
export interface ContractRegistryOptions {
  /**
   * Cap of the default budget of a call (`OperationMetadata.callBudgetMs`:
   * all attempts plus the longest waits). Defaults to 25 000 ms, the
   * default budget of a saga step.
   */
  readonly maxCallBudgetMs?: number;
}
