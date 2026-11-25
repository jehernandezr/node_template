import type { ErrorCatalogEntry, ServiceContract } from '@contracts/platform';
import type { ServiceSettings } from '@platform/config';
import type { z } from 'zod';
import type { ServiceInternalApi } from './service-internal-api.js';
import type { ServiceMigrations } from './service-migrations.js';
import type { ServiceSharding } from './service-sharding.js';

/** Class of the service business root module. It is its own type so the core does not import NestJS. */
export type ServiceModuleClass = abstract new (...args: never[]) => object;

/**
 * Everything the platform needs to know about a service to start it, migrate it and
 * connect it. Each service declares it in a single place and `ServiceBootstrap` and
 * `ServiceMigrator` consume it.
 */
export interface ServiceDefinition<
  C extends ServiceSettings = ServiceSettings,
> {
  /** Service name; matches `contract.service` (for example `identity`). */
  readonly name: string;
  /** The service's own schema; the libraries bring their configuration sections. */
  readonly configSchema: z.ZodType<C>;
  /** Root module with the business modules. It does not register platform modules. */
  readonly rootModule: ServiceModuleClass;
  readonly contract: ServiceContract;
  /** Contracts of other services this one talks to (commands it sends, events it consumes, operations it calls). */
  readonly peerContracts?: readonly ServiceContract[];
  readonly migrations: ServiceMigrations;
  /** Without a value: tenant key and `requireScope` off. */
  readonly sharding?: ServiceSharding;
  /** Without a value: in-process internal API. */
  readonly internalApi?: ServiceInternalApi;
  /** Error catalogs of the service; the HTTP filter consumes them together with those of the libraries. */
  readonly errorCatalogs: readonly (readonly ErrorCatalogEntry[])[];
}
