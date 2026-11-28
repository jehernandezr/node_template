import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('entry points', () => {
  const srcDir = join(__dirname, '..');
  const read = (file: string): string =>
    readFileSync(join(srcDir, file), 'utf8');
  const main = read('main.ts');
  const worker = read('worker.ts');
  const migrate = read('migrate.ts');
  const seed = read('seed.ts');
  const tenantMove = read('tenant-move.ts');
  const lambda = read('lambda.ts');
  const signingKeys = read('signing-keys.ts');
  const instrumentation = read('instrumentation.ts');

  it.each([
    ['main.ts', main],
    ['worker.ts', worker],
    ['migrate.ts', migrate],
    ['seed.ts', seed],
    ['lambda.ts', lambda],
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

  it('seeds the region tenants without running jobs or consuming queues', () => {
    expect(seed).toContain('SeedRegionTenants');
    expect(seed).toContain('SchedulingMode.External');
    expect(seed).toContain('ServiceBootstrap.task(');
  });

  it('moves a tenant without running jobs or consuming queues', () => {
    expect(tenantMove).toContain('SchedulingMode.External');
    expect(tenantMove).toContain('ServiceBootstrap.task(');
  });

  it('seeds the smoke account after the region tenants', () => {
    expect(seed.indexOf('SeedSmokeAccount).execute()')).toBeGreaterThan(
      seed.indexOf('SeedRegionTenants).execute()'),
    );
  });

  it('exports the Lambda handler of the API with LambdaBootstrap.http', () => {
    expect(lambda).toContain('export const handler = LambdaBootstrap.http(');
    expect(lambda).toContain('HttpApplicationSetup');
  });

  it('fills the signing keys without starting identity, whose configuration needs them', () => {
    expect(signingKeys).toContain('new SigningKeysTask(');
    expect(signingKeys).not.toContain('ServiceBootstrap');
  });

  it('runs the worker with ServiceBootstrap.worker', () => {
    expect(worker).toContain('ServiceBootstrap.worker(');
  });

  it('migrates with ServiceMigrator', () => {
    expect(migrate).toContain('new ServiceMigrator()');
  });
});
