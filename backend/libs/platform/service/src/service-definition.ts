import type { ErrorCatalogEntry, ServiceContract } from '@contracts/platform';
import type { ServiceSettings } from '@platform/config';
import type { z } from 'zod';
import type { ServiceInternalApi } from './service-internal-api.js';
import type { ServiceMigrations } from './service-migrations.js';
import type { ServiceSharding } from './service-sharding.js';

/** Clase del módulo raíz de negocio del servicio. Es un tipo propio para que el núcleo no importe NestJS. */
export type ServiceModuleClass = abstract new (...args: never[]) => object;

/**
 * Todo lo que la plataforma necesita saber de un servicio para arrancarlo, migrarlo y
 * conectarlo. Lo declara cada servicio en un solo lugar y lo consumen `ServiceBootstrap` y
 * `ServiceMigrator`.
 */
export interface ServiceDefinition<
  C extends ServiceSettings = ServiceSettings,
> {
  /** Nombre del servicio; coincide con `contract.service` (por ejemplo `identity`). */
  readonly name: string;
  /** Esquema propio del servicio; las librerías traen sus secciones de configuración. */
  readonly configSchema: z.ZodType<C>;
  /** Módulo raíz con los módulos de negocio. No registra módulos de plataforma. */
  readonly rootModule: ServiceModuleClass;
  readonly contract: ServiceContract;
  /** Contratos de otros servicios con los que este habla (comandos que envía, eventos que consume, operaciones que llama). */
  readonly peerContracts?: readonly ServiceContract[];
  readonly migrations: ServiceMigrations;
  /** Sin valor: llave de tenant y `requireScope` apagado. */
  readonly sharding?: ServiceSharding;
  /** Sin valor: API interna en proceso. */
  readonly internalApi?: ServiceInternalApi;
  /** Catálogos de error del servicio; los consume el filtro HTTP junto con los de las librerías. */
  readonly errorCatalogs: readonly (readonly ErrorCatalogEntry[])[];
}
