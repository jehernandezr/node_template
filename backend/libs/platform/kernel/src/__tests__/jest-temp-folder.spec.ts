import { existsSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

interface TempFolder {
  open(): string;
  close(): string[];
  closeOrFail(): void;
}

const { JestTempFolder } = createRequire(__filename)(
  join(__dirname, '../../../../../jest.temp-folder.cjs'),
) as { JestTempFolder: new (env: NodeJS.ProcessEnv) => TempFolder };

describe('JestTempFolder', () => {
  const opened = (env: NodeJS.ProcessEnv) => {
    const folder = new JestTempFolder(env);
    return { folder, path: folder.open() };
  };

  it('points every temporary folder variable at a new folder', () => {
    const env: NodeJS.ProcessEnv = { TMP: '/elsewhere' };
    const { folder, path } = opened(env);

    expect([env.TMPDIR, env.TMP, env.TEMP]).toEqual([path, path, path]);
    expect(existsSync(path)).toBe(true);
    folder.close();
  });

  it('removes the folder and restores the variables as they were', () => {
    const env: NodeJS.ProcessEnv = { TMP: '/elsewhere' };
    const { folder, path } = opened(env);

    expect(folder.close()).toEqual([]);
    expect(existsSync(path)).toBe(false);
    expect(env).toEqual({ TMP: '/elsewhere' });
  });

  it('fails the run when a suite left a file behind, and still removes the folder', () => {
    const env: NodeJS.ProcessEnv = {};
    const { folder, path } = opened(env);
    writeFileSync(join(path, 'migration-forgotten'), '');

    expect(() => folder.closeOrFail()).toThrow(/migration-forgotten/);
    expect(existsSync(path)).toBe(false);
  });

  it('ignores the lock file of the container tooling', () => {
    const env: NodeJS.ProcessEnv = {};
    const { folder, path } = opened(env);
    writeFileSync(join(path, 'testcontainers-node-1000.lock'), '');

    expect(() => folder.closeOrFail()).not.toThrow();
  });

  it('does nothing when the run never opened a folder', () => {
    expect(new JestTempFolder({}).close()).toEqual([]);
  });
});
