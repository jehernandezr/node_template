import { GeneratorSmoke } from '../generator-smoke.js';
import {
  InMemoryFileSystem,
  InMemoryWorkspaceCopier,
  RecordingCommandRunner,
} from './utils/index.js';

const COPY = InMemoryWorkspaceCopier.ROOT;

const smokeWith = (runner: RecordingCommandRunner) => {
  const files = new InMemoryFileSystem();
  const copier = new InMemoryWorkspaceCopier(files, {
    tsconfig: JSON.stringify({
      compilerOptions: {
        paths: { '@contracts/tasks': ['./libs/contracts/tasks/src/index.ts'] },
      },
    }),
    eslintConfig: "...['tasks', 'billing'].map(\n  (service) => service,\n);\n",
  });
  return { files, copier, smoke: new GeneratorSmoke(copier, runner, files) };
};

describe('GeneratorSmoke', () => {
  it('generates a service and a module in the copy, wires the shared files and runs the four targets on both projects', async () => {
    const runner = new RecordingCommandRunner();
    const { files, copier, smoke } = smokeWith(runner);

    const code = await smoke.run();

    expect(code).toBe(0);
    expect(runner.runs.map((run) => run.cwd)).toEqual([
      `${COPY}/backend`,
      `${COPY}/backend`,
      COPY,
    ]);
    expect(runner.runs[0]?.args.slice(-2)).toEqual([
      'service',
      '--name=smoke-probe',
    ]);
    expect(runner.runs[1]?.args.slice(-3)).toEqual([
      'module',
      '--service=smoke-probe',
      '--name=probe-items',
    ]);
    expect(runner.runs[2]?.args).toEqual(
      expect.arrayContaining([
        'nx',
        'run-many',
        '--targets=lint,test,typecheck,build',
        '--projects=smoke-probe,contracts-smoke-probe',
      ]),
    );
    expect(
      runner.runs.every((run) => run.unset?.includes('TSX_TSCONFIG_PATH')),
    ).toBe(true);
    expect(runner.runs.every((run) => run.env?.['NX_DAEMON'] === 'false')).toBe(
      true,
    );
    await expect(
      files.read(`${COPY}/backend/tsconfig.base.json`),
    ).resolves.toContain(
      '"@contracts/smoke-probe": [\n        "./libs/contracts/smoke-probe/src/index.ts"',
    );
    await expect(
      files.read(`${COPY}/backend/eslint.config.mjs`),
    ).resolves.toContain("...['tasks', 'billing', 'smoke-probe'].map(");
    expect(copier.removed).toEqual([COPY]);
  });

  it('stops at the first step that fails and still removes the copy', async () => {
    const runner = new RecordingCommandRunner(new Map([[1, 2]]));
    const { copier, smoke } = smokeWith(runner);

    const code = await smoke.run();

    expect(code).toBe(2);
    expect(runner.runs).toHaveLength(1);
    expect(copier.removed).toEqual([COPY]);
  });

  it('removes the copy when a command cannot start', async () => {
    const runner = new RecordingCommandRunner(
      new Map(),
      new Error('spawn pnpm ENOENT'),
    );
    const { copier, smoke } = smokeWith(runner);

    await expect(smoke.run()).rejects.toThrow('ENOENT');
    expect(copier.removed).toEqual([COPY]);
  });
});
