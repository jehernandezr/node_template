import { WorkspaceCopier } from '../../workspace-copier.js';
import type { InMemoryFileSystem } from './in-memory-file-system.js';

/** An in-memory copy of the workspace with the two shared files the smoke test edits. */
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

  override async copy(): Promise<string> {
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

  override async remove(root: string): Promise<void> {
    this.removed.push(root);
  }
}
