import { Compensation, type OperationDefinition } from '@contracts/platform';
import { InternalApiError } from '../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import type { ContractRegistryOptions } from './contract-registry.options.js';
import { JsonSafetyChecker } from './json-safety-checker.js';
import { OperationResolver } from './operation-resolver.js';
import type { RegisteredContract } from './registered-contract.js';
import type { RegistryIssue } from './registry-issue.js';
import { RegistryIssueCode } from './registry-issue-code.enum.js';

/** Catálogo de las operaciones que un servicio publica. */
export class ContractRegistry {
  private static readonly DEFAULT_MAX_CALL_BUDGET_MS = 25_000;

  private readonly entries: RegisteredContract[] = [];
  private readonly byId = new Map<string, RegisteredContract>();
  private readonly maxCallBudgetMs: number;
  private readonly resolver: OperationResolver;
  private readonly jsonSafety: JsonSafetyChecker;

  constructor(options: ContractRegistryOptions = {}) {
    this.maxCallBudgetMs =
      options.maxCallBudgetMs ?? ContractRegistry.DEFAULT_MAX_CALL_BUDGET_MS;
    this.resolver = options.resolver ?? new OperationResolver();
    this.jsonSafety = options.jsonSafety ?? new JsonSafetyChecker();
  }

  /**
   * Registra operaciones desde su descriptor de `defineOperation`. Los
   * duplicados se aceptan aquí y los informa `validate()`.
   * @throws InternalApiError `InvalidOperation` para cualquier otro valor y
   *   `NonJsonSafeSchema` para esquemas que no sobreviven al transporte JSON.
   */
  register(...definitions: OperationDefinition[]): void {
    for (const definition of definitions) {
      const descriptor = this.resolver.resolve(definition);
      this.jsonSafety.assertSafe(descriptor, descriptor.id);

      const entry: RegisteredContract = {
        id: descriptor.id,
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

  /** Revisa ids, destinos de compensación y presupuestos. Devuelve un arreglo vacío si es válido. */
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

      const budget = metadata.callBudgetMs();
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

  /** @throws InternalApiError con todos los problemas listados si el registro no es válido. */
  assertValid(): void {
    const issues = this.validate();
    if (issues.length === 0) {
      return;
    }
    throw new InternalApiError(
      ContractRegistry.errorCodeOf(issues),
      `Invalid contract registry:\n${issues.map((issue) => `  ${issue.message}`).join('\n')}`,
    );
  }

  /** Primer contrato registrado con ese `id`. */
  get(id: string): RegisteredContract | undefined {
    return this.byId.get(id);
  }

  /** Una entrada por id de operación. */
  operations(): RegisteredContract[] {
    return [...this.byId.values()];
  }

  /** Código de `assertValid`: el del tipo de problema más grave. */
  private static errorCodeOf(
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
}
