import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ErrorAudience } from '../enums/error-audience.enum.js';
import { PlatformErrorCode } from '../enums/platform-error-code.enum.js';
import { ERROR_CODE_PATTERN, messageKeyFor } from '../kit/error-catalog.js';
import { platformErrorCatalog } from './platform-error-catalog.js';

/** Archivos `.ts` de producción (sin specs) bajo `dir`. */
function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...sourceFiles(path));
    else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) {
      files.push(path);
    }
  }
  return files;
}

describe('platformErrorCatalog', () => {
  const values = Object.values(PlatformErrorCode);

  it('has exactly one entry per enum value, in enum order', () => {
    expect(platformErrorCatalog.map((e) => e.code)).toEqual(values);
  });

  it('uses codes in the SERVICIO.SUBMODULO.ERROR format without repeats', () => {
    for (const value of values) expect(value).toMatch(ERROR_CODE_PATTERN);
    expect(new Set(values).size).toBe(values.length);
  });

  it('derives each messageKey with the ARB naming of the front', () => {
    for (const entry of platformErrorCatalog) {
      expect(entry.messageKey).toBe(messageKeyFor(entry.code));
      expect(entry.messageKey).toMatch(/^error_platform_[a-z_]+$/);
    }
    expect(messageKeyFor(PlatformErrorCode.RateLimitExceeded)).toBe(
      'error_platform_rate_limit_exceeded',
    );
  });

  it('has valid statuses, audiences and Spanish descriptions', () => {
    for (const entry of platformErrorCatalog) {
      expect(entry.httpStatus).toBeGreaterThanOrEqual(400);
      expect(entry.httpStatus).toBeLessThan(600);
      expect(Object.values(ErrorAudience)).toContain(entry.audience);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.description).not.toContain('—');
    }
  });

  it('keeps the codes the front already shows as public', () => {
    const publicCodes = platformErrorCatalog
      .filter((e) => e.audience === ErrorAudience.Public)
      .map((e) => e.code);
    expect(publicCodes).toEqual(
      expect.arrayContaining([
        PlatformErrorCode.ValidationInvalidInput,
        PlatformErrorCode.AuthForbidden,
        PlatformErrorCode.ShardingTenantMigrating,
        PlatformErrorCode.InternalUnexpected,
      ]),
    );
  });

  it('marks TENANT_MIGRATING as retryable with status 503', () => {
    const entry = platformErrorCatalog.find(
      (e) => e.code === PlatformErrorCode.ShardingTenantMigrating,
    );
    expect(entry).toMatchObject({ httpStatus: 503, retryable: true });
  });

  it('covers every PLATFORM code declared in libs/platform', () => {
    const root = join(__dirname, '..', '..', '..', '..', 'platform');
    const declared = new Set<string>();
    for (const file of sourceFiles(root)) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/'(PLATFORM\.[A-Z_]+\.[A-Z_]+)'/g)) {
        declared.add(match[1]);
      }
    }
    expect(declared.size).toBeGreaterThan(0);
    const catalogued = new Set<string>(values);
    const missing = [...declared].filter((code) => !catalogued.has(code));
    expect(missing).toEqual([]);
  });
});
