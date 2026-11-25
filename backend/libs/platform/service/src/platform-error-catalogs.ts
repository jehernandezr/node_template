import type { ErrorCatalogEntry } from '@contracts/platform';
import { valkeyErrorCatalog } from '@platform/adapters-valkey';
import { cacheErrorCatalog } from '@platform/cache';
import { configErrorCatalog } from '@platform/config';
import { internalApiErrorCatalog } from '@platform/internal-api';
import { messagingErrorCatalog } from '@platform/messaging';
import { observabilityErrorCatalog } from '@platform/observability';
import { persistenceErrorCatalog } from '@platform/persistence';
import { resilienceErrorCatalog } from '@platform/resilience';
import { sagaErrorCatalog } from '@platform/saga';
import { schedulingErrorCatalog } from '@platform/scheduling';
import { shardingErrorCatalog } from '@platform/sharding';
import { serviceErrorCatalog } from './errors/service-error-catalog.js';

/** Catalogs of the libraries that run in every service; each service adds those of its contract. */
export const PLATFORM_LIBRARY_ERROR_CATALOGS: readonly (readonly ErrorCatalogEntry[])[] =
  [
    shardingErrorCatalog,
    persistenceErrorCatalog,
    resilienceErrorCatalog,
    cacheErrorCatalog,
    messagingErrorCatalog,
    internalApiErrorCatalog,
    sagaErrorCatalog,
    schedulingErrorCatalog,
    serviceErrorCatalog,
    observabilityErrorCatalog,
    configErrorCatalog,
    valkeyErrorCatalog,
  ];
