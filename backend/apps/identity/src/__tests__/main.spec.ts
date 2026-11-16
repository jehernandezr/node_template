import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Los puntos de entrada arrancan el proceso real y no se ejecutan aquí: se lee su texto para comprobar
 * el orden que importa: la telemetría antes que cualquier otra cosa y cada binario con su arranque.
 */
describe('entry points', () => {
  const srcDir = join(__dirname, '..');
  const read = (file: string): string =>
    readFileSync(join(srcDir, file), 'utf8');
  const main = read('main.ts');
  const worker = read('worker.ts');
  const migrate = read('migrate.ts');
  const instrumentation = read('instrumentation.ts');

  it.each([
    ['main.ts', main],
    ['worker.ts', worker],
    ['migrate.ts', migrate],
  ])('loads the instrumentation first in %s', (_, text) => {
    const firstImport = /^import\s+['"]([^'"]+)['"];?/m.exec(text);

    expect(firstImport?.[1]).toBe('./instrumentation.js');
  });

  it('starts the telemetry from the observability setup', () => {
    expect(instrumentation).toContain("from '@platform/observability/setup'");
  });

  it('serves HTTP with ServiceBootstrap.http and the HTTP setup', () => {
    expect(main).toContain('ServiceBootstrap.http(');
    expect(main).toContain('HttpApplicationSetup');
  });

  it('runs the worker with ServiceBootstrap.worker', () => {
    expect(worker).toContain('ServiceBootstrap.worker(');
  });

  it('migrates with ServiceMigrator', () => {
    expect(migrate).toContain('new ServiceMigrator()');
  });
});
