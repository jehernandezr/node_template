import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ErrorAudience } from '../../enums/error-audience.enum.js';
import { PlatformErrorCode } from '../../enums/platform-error-code.enum.js';
import { ERROR_CODE_PATTERN, messageKeyFor } from '../../kit/error-catalog.js';
import { platformErrorCatalog } from '../platform-error-catalog.js';

/** Carpetas generadas o de terceros que no declaran códigos propios. */
const SKIPPED_SEGMENT = /(^|\/)(node_modules|dist)(\/|$)/;

/**
 * Archivos `.ts` de producción (sin specs) bajo `dir`. Los enums de códigos de
 * cada librería (`*-error-code.enum.ts`) quedan fuera: cada librería declara su
 * propio catálogo.
 */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter(
      (path) =>
        !SKIPPED_SEGMENT.test(path) &&
        path.endsWith('.ts') &&
        !path.endsWith('.spec.ts') &&
        !path.endsWith('-error-code.enum.ts'),
    )
    .map((path) => join(dir, path));
}

describe('platformErrorCatalog', () => {
  const values = Object.values(PlatformErrorCode);
  const entries = platformErrorCatalog.map(
    (entry) => [entry.code, entry] as const,
  );

  it('has exactly one entry per enum value, in enum order', () => {
    expect(platformErrorCatalog.map((e) => e.code)).toEqual(values);
  });

  it('has no repeated codes', () => {
    expect(new Set(values).size).toBe(values.length);
  });

  it.each(values)('uses the SERVICIO.SUBMODULO.ERROR format in %s', (value) => {
    expect(value).toMatch(ERROR_CODE_PATTERN);
  });

  it.each(entries)(
    'derives the messageKey of %s with the ARB naming of the front',
    (_code, entry) => {
      expect(entry.messageKey).toBe(messageKeyFor(entry.code));
      expect(entry.messageKey).toMatch(/^error_platform_[a-z_]+$/);
    },
  );

  it('derives the messageKey from the code in snake case', () => {
    expect(messageKeyFor(PlatformErrorCode.RateLimitExceeded)).toBe(
      'error_platform_rate_limit_exceeded',
    );
  });

  it.each(entries)(
    'gives %s a valid status, audience and Spanish description',
    (_code, entry) => {
      expect(entry.httpStatus).toBeGreaterThanOrEqual(400);
      expect(entry.httpStatus).toBeLessThan(600);
      expect(Object.values(ErrorAudience)).toContain(entry.audience);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.description).not.toContain('—');
    },
  );

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
    const root = join(__dirname, '..', '..', '..', '..', '..', 'platform');
    const declared = new Set(
      sourceFiles(root).flatMap((file) =>
        [
          ...readFileSync(file, 'utf8').matchAll(
            /'(PLATFORM\.[A-Z_]+\.[A-Z_]+)'/g,
          ),
        ].map((match) => match[1]),
      ),
    );
    expect(declared.size).toBeGreaterThan(0);
    const catalogued = new Set<string>(values);
    const missing = [...declared].filter((code) => !catalogued.has(code));
    expect(missing).toEqual([]);
  });
});
