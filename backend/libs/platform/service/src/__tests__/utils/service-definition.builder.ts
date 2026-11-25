import { defineServiceContract } from '@contracts/platform';
import { serviceConfigSchema } from '@platform/config';
import type { ServiceDefinition } from '../../service-definition.js';
import { TestRootModule } from './test-root.module.js';

/** Builds a minimal valid `ServiceDefinition`; each `with*` changes a field. */
export class ServiceDefinitionBuilder {
  private definition: ServiceDefinition;

  private constructor(name: string) {
    this.definition = {
      name,
      configSchema: serviceConfigSchema,
      rootModule: TestRootModule,
      contract: defineServiceContract({
        service: name,
        description: 'Servicio de prueba',
      }),
      migrations: {
        catalog: { entities: [], migrations: [] },
        shard: { entities: [], migrations: [] },
      },
      errorCatalogs: [],
    };
  }

  static aDefinition(name = 'test-service'): ServiceDefinitionBuilder {
    return new ServiceDefinitionBuilder(name);
  }

  with(changes: Partial<ServiceDefinition>): ServiceDefinitionBuilder {
    this.definition = { ...this.definition, ...changes };
    return this;
  }

  build(): ServiceDefinition {
    return this.definition;
  }
}
