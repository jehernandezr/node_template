import {
  Compensation,
  effectiveAttempts,
  effectiveTimeout,
  getOperationMetadata,
} from './contract.js';
import type {
  ContractConstructor,
  OperationContract,
  OperationMetadata,
} from './contract.js';
import { InternalApiError, InternalApiErrorCode } from './errors.js';
import { assertJsonSafeContract } from './json-safety.js';

export type RegistryIssueCode =
  | 'duplicate-id'
  | 'missing-compensation'
  | 'unknown-compensation'
  | 'call-budget-exceeded';

/** Problem found by `ContractRegistry.validate()`. */
export interface RegistryIssue {
  readonly code: RegistryIssueCode;
  readonly operationId: string;
  readonly message: string;
}

/** A registered contract with its metadata and schema-bearing instance. */
export interface RegisteredContract {
  readonly id: string;
  readonly ContractClass: ContractConstructor;
  readonly metadata: OperationMetadata;
  readonly contract: OperationContract<unknown, unknown>;
}

export interface ContractRegistryOptions {
  /** Upper bound for `timeoutMs * maxAttempts` of one call. Defaults to 25 000 ms. */
  readonly maxCallBudgetMs?: number;
}

const DEFAULT_MAX_CALL_BUDGET_MS = 25_000;

/** Catalogue of the operations a service publishes. */
export class ContractRegistry {
  private readonly entries: RegisteredContract[] = [];
  private readonly byId = new Map<string, RegisteredContract>();
  private readonly maxCallBudgetMs: number;

  constructor(options: ContractRegistryOptions = {}) {
    this.maxCallBudgetMs =
      options.maxCallBudgetMs ?? DEFAULT_MAX_CALL_BUDGET_MS;
  }

  /**
   * Registers contract classes. Duplicates are accepted here and reported by `validate()`.
   * Throws when a class is undecorated or uses schemas that are not JSON-safe.
   */
  register(...contracts: ContractConstructor[]): void {
    for (const ContractClass of contracts) {
      const metadata = getOperationMetadata(ContractClass);
      if (!metadata) {
        throw new TypeError(
          `${ContractClass.name} is not decorated with @Operation`,
        );
      }
      const contract = new ContractClass();
      assertJsonSafeContract(contract, metadata.id);

      const entry: RegisteredContract = {
        id: metadata.id,
        ContractClass,
        metadata,
        contract,
      };
      this.entries.push(entry);
      if (!this.byId.has(entry.id)) {
        this.byId.set(entry.id, entry);
      }
    }
  }

  /** Checks ids, compensation targets and call budgets. Returns an empty array when valid. */
  validate(): RegistryIssue[] {
    const issues: RegistryIssue[] = [];
    const seen = new Set<string>();
    const reportedDuplicates = new Set<string>();

    for (const { id } of this.entries) {
      if (seen.has(id) && !reportedDuplicates.has(id)) {
        reportedDuplicates.add(id);
        issues.push({
          code: 'duplicate-id',
          operationId: id,
          message: `Operation id "${id}" is registered more than once`,
        });
      }
      seen.add(id);
    }

    for (const { id, metadata } of this.entries) {
      const { compensatedBy, mutating } = metadata;

      if (compensatedBy === undefined) {
        if (mutating) {
          issues.push({
            code: 'missing-compensation',
            operationId: id,
            message: `Mutating operation "${id}" must declare compensatedBy`,
          });
        }
      } else if (
        compensatedBy !== Compensation.None &&
        !this.byId.has(compensatedBy)
      ) {
        issues.push({
          code: 'unknown-compensation',
          operationId: id,
          message: `Operation "${id}" is compensated by "${compensatedBy}", which is not registered`,
        });
      }

      const budget = effectiveAttempts(metadata) * effectiveTimeout(metadata);
      if (budget > this.maxCallBudgetMs) {
        issues.push({
          code: 'call-budget-exceeded',
          operationId: id,
          message: `Operation "${id}" can take ${budget} ms (timeout x attempts), above the ${this.maxCallBudgetMs} ms budget`,
        });
      }
    }

    return issues;
  }

  /** Throws `InternalApiError` listing every issue when the registry is invalid. */
  assertValid(): void {
    const issues = this.validate();
    if (issues.length === 0) {
      return;
    }
    const code = issues.some((issue) => issue.code === 'duplicate-id')
      ? InternalApiErrorCode.DuplicateOperation
      : InternalApiErrorCode.MissingCompensation;
    throw new InternalApiError(
      code,
      `Invalid contract registry:\n${issues.map((issue) => `  ${issue.message}`).join('\n')}`,
    );
  }

  /** Returns the first contract registered under `id`. */
  get(id: string): RegisteredContract | undefined {
    return this.byId.get(id);
  }

  /** Returns one entry per operation id. */
  operations(): RegisteredContract[] {
    return [...this.byId.values()];
  }
}
