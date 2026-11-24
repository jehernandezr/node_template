import { WorkspaceCopier } from '../../workspace-copier.js';
import type { InMemoryFileSystem } from './in-memory-file-system.js';

/** Una copia del workspace en memoria con los dos archivos compartidos que la prueba de humo edita. */
export class InMemoryWorkspaceCopier extends WorkspaceCopier {
  static readonly ROOT = '/copy';
  readonly removed: string[] = [];

  constructor(
    private readonly files: InMemoryFileSystem,
    private readonly shared: {
      readonly tsconfig: string;
      readonly eslintConfig: string;
    },
  ) {
    super();
  }

  async copy(): Promise<string> {
    const backend = `${InMemoryWorkspaceCopier.ROOT}/backend`;
    await this.files.write(
      `${backend}/tsconfig.base.json`,
      this.shared.tsconfig,
    );
    await this.files.write(
      `${backend}/eslint.config.mjs`,
      this.shared.eslintConfig,
    );
    return InMemoryWorkspaceCopier.ROOT;
  }

  async remove(root: string): Promise<void> {
    this.removed.push(root);
  }
}
