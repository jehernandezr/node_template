import type { DatabaseSettings } from './config/database.config.js';
import { PersistenceError } from './errors/persistence-error.js';
import { PersistenceErrorCode } from './errors/persistence-error-code.enum.js';
import type { InstanceEndpoints } from './model/instance-endpoints.js';
import { InstanceEndpointResolver } from './ports/instance-endpoint-resolver.js';

/** Resuelve instancias con el mapa `DB_INSTANCES` de la configuración. */
export class ConfigInstanceEndpointResolver extends InstanceEndpointResolver {
  constructor(private readonly instances: DatabaseSettings['DB_INSTANCES']) {
    super();
  }

  resolve(instance: string): InstanceEndpoints {
    // Un nombre como `constructor` no es una instancia configurada aunque exista en el prototipo.
    if (Object.hasOwn(this.instances, instance)) {
      return this.instances[instance];
    }
    throw new PersistenceError(
      PersistenceErrorCode.InvalidConfig,
      'Unknown database instance',
      { details: { instance } },
    );
  }
}
