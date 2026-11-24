import { cp, mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { WorkspaceCopier } from './workspace-copier.js';

/**
 * Copia a una carpeta temporal lo que Nx necesita para correr los proyectos del backend: los archivos de la raíz,
 * `backend/` sin lo compilado ni los reportes, y el plugin de Nx del front. `node_modules` no se copia: se enlaza.
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

  constructor(private readonly workspaceRoot: string) {
    super();
  }

  async copy(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'generators-smoke-'));
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

  async remove(root: string): Promise<void> {
    await rm(root, { recursive: true, force: true });
  }
}
