import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('entry points', () => {
  const srcDir = join(__dirname, '..');
  const read = (file: string): string =>
    readFileSync(join(srcDir, file), 'utf8');
  const worker = read('worker.ts');
  const seed = read('seed.ts');

  it('seeds the plans without running jobs or consuming queues', () => {
    expect(seed).toContain('SeedPlans');
    expect(seed).toContain('SchedulingMode.External');
    expect(seed).toContain('ServiceBootstrap.task(');
  });

  it('runs the worker with ServiceBootstrap.worker', () => {
    expect(worker).toContain('ServiceBootstrap.worker(');
  });
});
