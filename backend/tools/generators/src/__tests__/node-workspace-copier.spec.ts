import { existsSync, lstatSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { NodeWorkspaceCopier } from '../node-workspace-copier.js';

const WORKSPACE_FILES = [
  'nx.json',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.json',
  '.nvmrc',
  '.prettierrc',
  'backend/package.json',
  'backend/dist/tasks/main.mjs',
  'backend/apps/tasks/coverage/index.html',
  'front/tools/nx-plugin/index.js',
  'node_modules/nx/package.json',
];

describe('NodeWorkspaceCopier', () => {
  let workspace: string;
  let copier: NodeWorkspaceCopier;

  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), 'workspace-copier-'));
    for (const file of WORKSPACE_FILES) {
      await mkdir(dirname(join(workspace, file)), { recursive: true });
      await writeFile(join(workspace, file), '{}\n');
    }
    copier = new NodeWorkspaceCopier(workspace);
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  it('copies into the workspace tmp folder, not into the system temporary folder', async () => {
    const root = await copier.copy();

    expect(dirname(root)).toBe(join(workspace, NodeWorkspaceCopier.COPIES));
    expect(relative(join(workspace, 'backend'), root).startsWith('..')).toBe(
      true,
    );
  });

  it('copies the root files, backend without build output or reports, and the front Nx plugin, and links node_modules', async () => {
    const root = await copier.copy();

    expect(existsSync(join(root, 'pnpm-workspace.yaml'))).toBe(true);
    expect(existsSync(join(root, 'backend/package.json'))).toBe(true);
    expect(existsSync(join(root, 'backend/dist'))).toBe(false);
    expect(existsSync(join(root, 'backend/apps/tasks/coverage'))).toBe(false);
    expect(existsSync(join(root, 'front/tools/nx-plugin/index.js'))).toBe(true);
    expect(lstatSync(join(root, 'node_modules')).isSymbolicLink()).toBe(true);
  });

  it('removes the copy and leaves the tmp folder as it was', async () => {
    const root = await copier.copy();

    await copier.remove(root);

    expect(existsSync(root)).toBe(false);
    expect(await readdir(join(workspace, NodeWorkspaceCopier.COPIES))).toEqual(
      [],
    );
    expect(existsSync(join(workspace, 'node_modules/nx/package.json'))).toBe(
      true,
    );
  });
});
