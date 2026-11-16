import { identityContract } from '@contracts/identity';
import type { ErrorCatalogEntry } from '@contracts/platform';
import { valkeyErrorCatalog } from '@platform/adapters-valkey';
import { cacheErrorCatalog } from '@platform/cache';
import { configErrorCatalog } from '@platform/config';
import { internalApiErrorCatalog } from '@platform/internal-api';
import { messagingErrorCatalog } from '@platform/messaging';
import { observabilityErrorCatalog } from '@platform/observability';
import { persistenceErrorCatalog } from '@platform/persistence';
import { resilienceErrorCatalog } from '@platform/resilience';
import { schedulingErrorCatalog } from '@platform/scheduling';
import { serviceErrorCatalog } from '@platform/service';
import { sagaErrorCatalog } from '@platform/saga';
import { shardingErrorCatalog } from '@platform/sharding';

/** Catálogos de error que identity responde: los de su contrato y los de las librerías que usa. */
export const IDENTITY_ERROR_CATALOGS: readonly (readonly ErrorCatalogEntry[])[] =
  [
    ...Object.values(identityContract.errors),
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
