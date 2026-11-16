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

/** Con qué compila y valida el registro. */
export interface SagaRegistryOptions {
  readonly resolver: OperationResolver;
  /** Presupuesto de cada llamada de paso, contra el que se valida cada operación. */
  readonly maxStepDurationMs: number;
  /** Operaciones que los pasos llaman. Sin él no se pueden buscar las compensaciones. */
  readonly contracts?: ContractRegistry;
}

/**
 * Las sagas que corre el motor, por tipo. Los módulos registran sus
 * definiciones con `add`; `seal` las compila y valida todas de una vez, así una
 * definición inválida falla al arrancar y no con la primera saga de su tipo.
 */
export class SagaRegistry {
  private readonly pending: SagaDefinition<unknown>[] = [];
  private compiled: ReadonlyMap<string, CompiledSaga<unknown>> | undefined;
  private readonly typeByClass = new Map<unknown, string>();

  constructor(private readonly options: SagaRegistryOptions) {}

  /** @throws SagaError `InvalidConfiguration` si el registro ya está sellado. */
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
   * Compila y valida las definiciones. Es idempotente.
   * @throws SagaError `InvalidDefinition` por un tipo repetido o por cualquier
   *   problema de `SagaValidator`; `MissingCompensation` desde la compilación.
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

  /** La saga compilada de un tipo. Sella el registro si aún no lo está. @throws SagaError `UnknownDefinition` */
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

  /** El `type` con el que se registró una clase de definición. @throws SagaError `UnknownDefinition` */
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
