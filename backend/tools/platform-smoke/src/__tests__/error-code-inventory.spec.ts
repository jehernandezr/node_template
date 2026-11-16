import {
  ERROR_CODE_PATTERN,
  ErrorAudience,
  ErrorCatalog,
  platformErrorCatalog,
  type ErrorCatalogEntry,
} from '@contracts/platform';
import { ErrorCode } from '@platform/kernel';
import {
  kernelErrorCatalog,
  primitivesErrorCatalog,
} from '@platform/primitives';
import { criteriaErrorCatalog } from '@platform/criteria';
import { shardingErrorCatalog } from '@platform/sharding';
import { resilienceErrorCatalog } from '@platform/resilience';
import { internalApiErrorCatalog } from '@platform/internal-api';
import { messagingErrorCatalog } from '@platform/messaging';
import { sagaErrorCatalog } from '@platform/saga';
import { bloomErrorCatalog } from '@platform/bloom';
import { cacheErrorCatalog } from '@platform/cache';
import { configErrorCatalog } from '@platform/config';
import { observabilityErrorCatalog } from '@platform/observability';
import { schedulingErrorCatalog } from '@platform/scheduling';
import { persistenceErrorCatalog } from '@platform/persistence';
import { rateLimitErrorCatalog } from '@platform/rate-limit';
import { valkeyErrorCatalog } from '@platform/adapters-valkey';
import { PreviousErrorCodes } from './utils/previous-error-codes.js';

/** Catálogos de las librerías que el servicio compone, además del central. */
const LIBRARY_CATALOGS: readonly (readonly ErrorCatalogEntry[])[] = [
  kernelErrorCatalog,
  primitivesErrorCatalog,
  criteriaErrorCatalog,
  shardingErrorCatalog,
  resilienceErrorCatalog,
  internalApiErrorCatalog,
  messagingErrorCatalog,
  sagaErrorCatalog,
  bloomErrorCatalog,
  cacheErrorCatalog,
  configErrorCatalog,
  observabilityErrorCatalog,
  schedulingErrorCatalog,
  persistenceErrorCatalog,
  rateLimitErrorCatalog,
  valkeyErrorCatalog,
];

const ALL_ENTRIES: readonly ErrorCatalogEntry[] = [
  ...platformErrorCatalog,
  ...LIBRARY_CATALOGS.flat(),
];

describe('error code inventory', () => {
  it('keeps every code the platform exposed before the cleanup', () => {
    const declared = new Set(ALL_ENTRIES.map((entry) => entry.code));

    const lost = PreviousErrorCodes.ALL.filter((code) => !declared.has(code));

    expect(lost).toEqual([]);
  });

  it('exposes only public codes from the central catalog', () => {
    const internal = platformErrorCatalog.filter(
      (entry) => entry.audience !== ErrorAudience.Public,
    );

    expect(internal.map((entry) => entry.code)).toEqual([]);
  });

  it('gives every code the format of the contracts and of the kernel', () => {
    for (const entry of ALL_ENTRIES) {
      expect(ERROR_CODE_PATTERN.test(entry.code)).toBe(true);
      expect(ErrorCode.PATTERN.test(entry.code)).toBe(true);
    }
  });

  it('composes all the catalogs into one registry with one entry per code', () => {
    const catalog = new ErrorCatalog();

    expect(() => catalog.register(platformErrorCatalog)).not.toThrow();
    for (const library of LIBRARY_CATALOGS) {
      expect(() => catalog.register(library)).not.toThrow();
    }

    const codes = new Set(ALL_ENTRIES.map((entry) => entry.code));
    expect(catalog.all()).toHaveLength(codes.size);
  });
});
