import type { DataSource } from 'typeorm';
import type { DatabaseTarget } from '../model/database-target.js';
import type { InstanceEndpoints } from '../model/instance-endpoints.js';

/** Construye el `DataSource` (sin inicializar) de una base lógica. Es la costura que las pruebas sustituyen. */
export abstract class DataSourceFactory {
  abstract create(
    target: DatabaseTarget,
    endpoints: InstanceEndpoints,
  ): DataSource;
}
