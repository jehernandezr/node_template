import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `main.ts` y `instrumentation.ts` arrancan el proceso real y no se ejecutan en una prueba: aquí se lee su
 * texto para comprobar el orden que importa: la telemetría antes que cualquier otra cosa y el apagado ordenado.
 */
describe('process entry point', () => {
  const srcDir = join(__dirname, '..');
  const main = readFileSync(join(srcDir, 'main.ts'), 'utf8');
  const instrumentation = readFileSync(
    join(srcDir, 'instrumentation.ts'),
    'utf8',
  );

  it('loads the instrumentation before anything else', () => {
    const firstImport =
      /^import\s+.*?from\s+['"]([^'"]+)['"];?|^import\s+['"]([^'"]+)['"];?/m.exec(
        main,
      );

    expect(firstImport?.[0]).toContain("'./instrumentation.js'");
  });

  it('enables the shutdown hooks', () => {
    expect(main).toContain('app.enableShutdownHooks()');
  });

  it('starts the telemetry from the observability setup', () => {
    expect(instrumentation).toContain("from '@platform/observability/setup'");
  });
});
