import type {
  ContractRegistry,
  OperationResolver,
} from '@platform/internal-api';
import { SagaError } from '../errors/saga-error.js';
import { SagaErrorCode } from '../errors/saga-error-code.enum.js';
import type { CompiledSaga } from './compiled-saga.js';
import type { SagaDefinition } from './saga-definition.js';
import { SagaDefinitionIssueCode } from './saga-definition-issue-code.enum.js';
import { SagaValidator } from './saga-validator.js';

/** What the registry compiles and validates with. */
export interface SagaRegistryOptions {
  readonly resolver: OperationResolver;
  /** Budget of each step call, against which each operation is validated. */
  readonly maxStepDurationMs: number;
  /** Operations that the steps call. Without it the compensations cannot be looked up. */
  readonly contracts?: ContractRegistry;
}

/**
 * The sagas the engine runs, by type. Modules register their
 * definitions with `add`; `seal` compiles and validates them all at once, so an
 * invalid definition fails at startup and not with the first saga of its type.
 */
export class SagaRegistry {
  private readonly pending: SagaDefinition<unknown>[] = [];
  private compiled: ReadonlyMap<string, CompiledSaga<unknown>> | undefined;
  private readonly typeByClass = new Map<unknown, string>();

  constructor(private readonly options: SagaRegistryOptions) {}

  /** @throws SagaError `InvalidConfiguration` if the registry is already sealed. */
  add(...definitions: readonly SagaDefinition<unknown>[]): void {
    if (this.compiled !== undefined) {
      throw new SagaError(
        SagaErrorCode.InvalidConfiguration,
        'Sagas cannot be registered after the registry was sealed',
      );
    }
    this.pending.push(...definitions);
  }

  /**
   * Compiles and validates the definitions. It is idempotent.
   * @throws SagaError `InvalidDefinition` for a repeated type or for any
   *   `SagaValidator` issue; `MissingCompensation` from compilation.
   */
  seal(): void {
    if (this.compiled !== undefined) {
      return;
    }
    const compiled = new Map<string, CompiledSaga<unknown>>();
    for (const definition of this.pending) {
      const saga = definition.build(this.options.resolver);
      if (compiled.has(saga.type)) {
        throw new SagaError(
          SagaErrorCode.InvalidDefinition,
          `Saga "${saga.type}" is declared more than once`,
          { details: { code: SagaDefinitionIssueCode.TypeMismatch } },
        );
      }
      compiled.set(saga.type, saga);
      this.typeByClass.set(definition.constructor, saga.type);
    }
    const issues = new SagaValidator(
      this.options.resolver,
      this.options.maxStepDurationMs,
      this.options.contracts,
    ).validate([...compiled.values()]);
    if (issues.length > 0) {
      throw new SagaError(
        SagaErrorCode.InvalidDefinition,
        `Invalid sagas:\n${issues.map((issue) => `  ${issue.message}`).join('\n')}`,
        { details: { issues } },
      );
    }
    this.compiled = compiled;
  }

  /** Returns the compiled saga of a type. Seals the registry if it is not sealed yet. @throws SagaError `UnknownDefinition` */
  get(type: string): CompiledSaga<unknown> {
    this.seal();
    const saga = this.compiled?.get(type);
    if (saga === undefined) {
      throw new SagaError(
        SagaErrorCode.UnknownDefinition,
        `No saga registered as "${type}"`,
      );
    }
    return saga;
  }

  /** Returns the `type` a definition class was registered with. @throws SagaError `UnknownDefinition` */
  typeOf(definition: abstract new (...args: never[]) => object): string {
    this.seal();
    const type = this.typeByClass.get(definition);
    if (type === undefined) {
      throw new SagaError(
        SagaErrorCode.UnknownDefinition,
        `No saga registered for ${definition.name}`,
      );
    }
    return type;
  }
}
