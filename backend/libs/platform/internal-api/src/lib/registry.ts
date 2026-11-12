import {
  Compensation,
  effectiveAttempts,
  effectiveTimeout,
  resolveOperation,
} from './contract.js';
import type {
  ContractConstructor,
  OperationDescriptor,
  OperationMetadata,
  OperationSchemas,
  OperationSource,
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

/** A registered operation with its metadata and schemas. */
export interface RegisteredContract {
  readonly id: string;
  /** The `@Operation` class, when the operation was registered from one. */
  readonly ContractClass?: ContractConstructor;
  readonly metadata: OperationMetadata;
  /** Input and output schemas. */
  readonly contract: OperationSchemas;
  readonly descriptor: OperationDescriptor;
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
   * Registers operations, from `defineOperation` descriptors or `@Operation`
   * classes. Duplicates are accepted here and reported by `validate()`.
   * Throws `InvalidOperation` for anything else and `NonJsonSafeSchema` for
   * schemas that do not survive JSON transport.
   */
  register(...sources: OperationSource[]): void {
    for (const source of sources) {
      const descriptor = resolveOperation(source);
      assertJsonSafeContract(descriptor, descriptor.id);

      const entry: RegisteredContract = {
        id: descriptor.id,
        ...(typeof source === 'function' && { ContractClass: source }),
        metadata: descriptor.metadata,
        contract: { input: descriptor.input, output: descriptor.output },
        descriptor,
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
