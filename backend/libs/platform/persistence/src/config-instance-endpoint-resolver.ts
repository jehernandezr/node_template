import { PlatformErrorCode } from '@contracts/platform';
import type { DatabaseSettings } from './config/database.config.js';
import { PersistenceError } from './errors.js';
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
      PlatformErrorCode.PersistenceInvalidConfig,
      'Unknown database instance',
      { details: { instance } },
    );
  }
}
