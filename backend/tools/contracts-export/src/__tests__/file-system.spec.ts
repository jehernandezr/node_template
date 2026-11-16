import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FileSystem } from '../file-system.js';
import { NodeFileSystem } from '../node-file-system.js';
import { InMemoryFileSystem } from './utils/in-memory-file-system.js';

interface Harness {
  readonly fileSystem: FileSystem;
  readonly root: string;
}

describe.each([
  [
    'NodeFileSystem',
    async (): Promise<Harness> => ({
      fileSystem: new NodeFileSystem(),
      root: await mkdtemp(join(tmpdir(), 'contracts-export-')),
    }),
  ],
  [
    'InMemoryFileSystem',
    (): Promise<Harness> =>
      Promise.resolve({
        fileSystem: new InMemoryFileSystem(),
        root: '/memory',
      }),
  ],
])('FileSystem port with %s', (_name, create) => {
  let harness: Harness;

  beforeEach(async () => {
    harness = await create();
  });

  afterEach(async () => {
    await rm(harness.root, { recursive: true, force: true });
  });

  it('reports a file as absent before it is written and present after', async () => {
    const { fileSystem, root } = harness;
    const file = `${root}/contract.json`;

    const before = await fileSystem.exists(file);
    await fileSystem.write(file, '{}');
    const after = await fileSystem.exists(file);

    expect(before).toBe(false);
    expect(after).toBe(true);
  });

  it('creates the missing folders on write and reads the same content back', async () => {
    const { fileSystem, root } = harness;
    const file = `${root}/a/b/c.json`;

    await fileSystem.write(file, '{"ok":true}');
    const content = await fileSystem.read(file);

    expect(content).toBe('{"ok":true}');
  });

  it('lists only the subdirectories of a folder in alphabetical order', async () => {
    const { fileSystem, root } = harness;
    await fileSystem.write(`${root}/zeta/x.ts`, '');
    await fileSystem.write(`${root}/alpha/y.ts`, '');
    await fileSystem.write(`${root}/file.json`, '');

    const directories = await fileSystem.listDirectories(root);

    expect(directories).toEqual(['alpha', 'zeta']);
  });
});
