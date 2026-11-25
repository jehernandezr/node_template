import type { Provider } from '@nestjs/common';
import { CallOutcomeFactory, FailureClassifier } from '@platform/primitives';
import { ContractRegistry } from '../contract/contract-registry.js';
import type { ContractRegistryOptions } from '../contract/contract-registry.options.js';
import { JsonSafetyChecker } from '../contract/json-safety-checker.js';
import { OperationResolver } from '../contract/operation-resolver.js';
import { PayloadLimit } from '../contract/payload-limit.js';
import type { InternalApiModuleOptions } from './internal-api-module-options.js';
import { INTERNAL_API_OPTIONS } from './internal-api.module-definition.js';
import { PublishedContracts } from './published-contracts.js';

/**
 * Proveedores de los catálogos de operaciones y de las piezas que comparten cliente y servidor. El `CallOutcomeFactory`
 * usa el `FailureClassifier` del servicio si lo hay, con las reglas de sus adaptadores: sin ellas un error pasajero de
 * la base sería permanente y el servidor respondería `protocol-violation`.
 */
export class InternalApiContractProviders {
  static build(): Provider[] {
    return [
      { provide: OperationResolver, useFactory: () => new OperationResolver() },
      { provide: JsonSafetyChecker, useFactory: () => new JsonSafetyChecker() },
      {
        provide: CallOutcomeFactory,
        useFactory: (failures?: FailureClassifier) =>
          new CallOutcomeFactory(failures ?? new FailureClassifier()),
        inject: [{ token: FailureClassifier, optional: true }],
      },
      {
        provide: PayloadLimit,
        useFactory: (options: InternalApiModuleOptions) =>
          new PayloadLimit(options.maxPayloadBytes),
        inject: [INTERNAL_API_OPTIONS],
      },
      {
        provide: ContractRegistry,
        useFactory: (
          options: InternalApiModuleOptions,
          resolver: OperationResolver,
          jsonSafety: JsonSafetyChecker,
        ) =>
          InternalApiContractProviders.registryOf(
            new ContractRegistry(
              InternalApiContractProviders.registryOptions(
                options,
                resolver,
                jsonSafety,
              ),
            ),
            [...options.operations, ...(options.remoteOperations ?? [])],
          ),
        inject: [INTERNAL_API_OPTIONS, OperationResolver, JsonSafetyChecker],
      },
      {
        provide: PublishedContracts,
        useFactory: (
          options: InternalApiModuleOptions,
          resolver: OperationResolver,
          jsonSafety: JsonSafetyChecker,
        ) =>
          InternalApiContractProviders.registryOf(
            new PublishedContracts(
              InternalApiContractProviders.registryOptions(
                options,
                resolver,
                jsonSafety,
              ),
            ),
            options.operations,
          ),
        inject: [INTERNAL_API_OPTIONS, OperationResolver, JsonSafetyChecker],
      },
    ];
  }

  private static registryOptions(
    options: InternalApiModuleOptions,
    resolver: OperationResolver,
    jsonSafety: JsonSafetyChecker,
  ): ContractRegistryOptions {
    return {
      ...(options.maxCallBudgetMs !== undefined && {
        maxCallBudgetMs: options.maxCallBudgetMs,
      }),
      resolver,
      jsonSafety,
    };
  }

  /** Un registro inválido hace fallar el arranque del servicio. */
  private static registryOf<R extends ContractRegistry>(
    registry: R,
    operations: InternalApiModuleOptions['operations'],
  ): R {
    registry.register(...operations);
    registry.assertValid();
    return registry;
  }
}
