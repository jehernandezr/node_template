import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { AppBundler } from '../app-bundler.js';
import { DecoratorMetadataPlugin } from '../decorator-metadata-plugin.js';

function write(root: string, path: string, content: string): void {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

describe('AppBundler', () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'app-bundler-'));
    write(
      workspace,
      'backend/tsconfig.base.json',
      JSON.stringify({
        compilerOptions: {
          experimentalDecorators: true,
          paths: { '@probe/lib': ['./libs/probe/src/index.ts'] },
        },
      }),
    );
    write(
      workspace,
      'backend/libs/probe/src/index.ts',
      "export class Greeter { greet(): string { return 'hola'; } }\n",
    );
    write(
      workspace,
      'backend/apps/probe/src/main.ts',
      [
        "import { Greeter } from '@probe/lib';",
        "import { helper } from './helper.js';",
        'function Injectable(): ClassDecorator { return () => undefined; }',
        '@Injectable()',
        'export class Service { constructor(readonly greeter: Greeter) {} }',
        'export const result = helper(new Service(new Greeter()).greeter.greet());',
        '',
      ].join('\n'),
    );
    write(
      workspace,
      'backend/apps/probe/src/helper.ts',
      'export const helper = (value: string): string => value.toUpperCase();\n',
    );
    write(
      workspace,
      'backend/apps/probe/src/worker.ts',
      "export const worker = 'worker';\n",
    );
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it('bundles each entry into backend/dist/<app> resolving aliases and relative .js imports', async () => {
    const bundler = new AppBundler(workspace, []);

    const outdir = await bundler.bundle({
      projectName: 'probe',
      projectRoot: 'backend/apps/probe',
      entryPoints: ['src/main.ts', 'src/worker.ts'],
    });

    expect(outdir).toBe(join(workspace, 'backend', 'dist', 'probe'));
    const main = readFileSync(join(outdir, 'main.mjs'), 'utf8');
    expect(main).toContain('hola');
    expect(main).toContain('toUpperCase');
    expect(main).not.toContain('@probe/lib');
    expect(readFileSync(join(outdir, 'worker.mjs'), 'utf8')).toContain(
      'worker',
    );
  });

  it('emits decorator metadata for constructor parameters', async () => {
    const bundler = new AppBundler(workspace, [
      new DecoratorMetadataPlugin().toPlugin(),
    ]);

    const outdir = await bundler.bundle({
      projectName: 'probe',
      projectRoot: 'backend/apps/probe',
      entryPoints: ['src/main.ts'],
    });

    expect(readFileSync(join(outdir, 'main.mjs'), 'utf8')).toContain(
      'design:paramtypes',
    );
  });

  it('removes the previous output before bundling', async () => {
    const bundler = new AppBundler(workspace, []);
    write(workspace, 'backend/dist/probe/stale.mjs', 'stale');

    const outdir = await bundler.bundle({
      projectName: 'probe',
      projectRoot: 'backend/apps/probe',
      entryPoints: ['src/main.ts'],
    });

    expect(() => readFileSync(join(outdir, 'stale.mjs'))).toThrow();
  });
});
