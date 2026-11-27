import { cp, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { WorkspaceCopier } from './workspace-copier.js';

/**
 * Copies what Nx needs to run the backend projects into the workspace's gitignored `tmp/` folder: the root files,
 * `backend/` without build output or reports, and the front Nx plugin. `node_modules` is not copied: it is linked.
 * The copy stays out of the system temporary folder, which can be a small in-memory file system, because the smoke
 * test builds and tests in it.
 */
export class NodeWorkspaceCopier extends WorkspaceCopier {
  private static readonly ROOT_FILES = [
    'nx.json',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'tsconfig.json',
    '.nvmrc',
    '.prettierrc',
  ];
  private static readonly SKIPPED = new Set([
    'node_modules',
    'dist',
    'test-output',
    'coverage',
    '.nx',
  ]);
  private static readonly FRONT_PLUGIN = join('front', 'tools', 'nx-plugin');
  static readonly COPIES = 'tmp';

  constructor(private readonly workspaceRoot: string) {
    super();
  }

  override async copy(): Promise<string> {
    const copies = join(this.workspaceRoot, NodeWorkspaceCopier.COPIES);
    await mkdir(copies, { recursive: true });
    const root = await mkdtemp(join(copies, 'generators-smoke-'));
    for (const file of NodeWorkspaceCopier.ROOT_FILES) {
      await cp(join(this.workspaceRoot, file), join(root, file));
    }
    await cp(join(this.workspaceRoot, 'backend'), join(root, 'backend'), {
      recursive: true,
      filter: (source) => !NodeWorkspaceCopier.SKIPPED.has(basename(source)),
    });
    await cp(
      join(this.workspaceRoot, NodeWorkspaceCopier.FRONT_PLUGIN),
      join(root, NodeWorkspaceCopier.FRONT_PLUGIN),
      { recursive: true },
    );
    await symlink(
      join(this.workspaceRoot, 'node_modules'),
      join(root, 'node_modules'),
      'dir',
    );
    return root;
  }

  override async remove(root: string): Promise<void> {
    await rm(root, { recursive: true, force: true });
  }
}
