import {
  Compensation,
  defaultCallBudgetMs,
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

/** Kind of problem found by `ContractRegistry.validate()`. */
export enum RegistryIssueCode {
  DuplicateId = 'duplicate-id',
  MissingCompensation = 'missing-compensation',
  UnknownCompensation = 'unknown-compensation',
  CallBudgetExceeded = 'call-budget-exceeded',
}

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
  /**
   * Upper bound for the default budget of one call (`defaultCallBudgetMs`:
   * every attempt plus the longest backoffs). Defaults to 25 000 ms, the
   * default step budget of a saga.
   */
  readonly maxCallBudgetMs?: number;
}

const DEFAULT_MAX_CALL_BUDGET_MS = 25_000;

/** Error code of `assertValid`: the most severe kind of issue found. */
function registryErrorCode(
  issues: readonly RegistryIssue[],
): InternalApiErrorCode {
  const has = (code: RegistryIssueCode): boolean =>
    issues.some((issue) => issue.code === code);
  if (has(RegistryIssueCode.DuplicateId)) {
    return InternalApiErrorCode.DuplicateOperation;
  }
  if (
    has(RegistryIssueCode.MissingCompensation) ||
    has(RegistryIssueCode.UnknownCompensation)
  ) {
    return InternalApiErrorCode.MissingCompensation;
  }
  return InternalApiErrorCode.CallBudgetExceeded;
}

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
          code: RegistryIssueCode.DuplicateId,
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
            code: RegistryIssueCode.MissingCompensation,
            operationId: id,
            message: `Mutating operation "${id}" must declare compensatedBy`,
          });
        }
      } else if (
        compensatedBy !== Compensation.None &&
        !this.byId.has(compensatedBy)
      ) {
        issues.push({
          code: RegistryIssueCode.UnknownCompensation,
          operationId: id,
          message: `Operation "${id}" is compensated by "${compensatedBy}", which is not registered`,
        });
      }

      const budget = defaultCallBudgetMs(metadata);
      if (budget > this.maxCallBudgetMs) {
        issues.push({
          code: RegistryIssueCode.CallBudgetExceeded,
          operationId: id,
          message: `Operation "${id}" can take ${budget} ms (attempts and backoffs), above the ${this.maxCallBudgetMs} ms budget`,
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
    throw new InternalApiError(
      registryErrorCode(issues),
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
