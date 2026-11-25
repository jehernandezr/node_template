import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { build, type Plugin } from 'esbuild';

export interface AppBundle {
  /** Nx project name; names the output folder. */
  readonly projectName: string;
  /** Project folder, relative to the repository root. */
  readonly projectRoot: string;
  /** Entradas relativas a `projectRoot`. */
  readonly entryPoints: readonly string[];
}

/**
 * Bundles a backend app into `backend/dist/<app>/`. The repository libraries
 * enter the bundle through their TypeScript aliases; node_modules dependencies stay
 * external and are installed in the image with the backend package.json.
 */
export class AppBundler {
  constructor(
    private readonly workspaceRoot: string,
    private readonly plugins: readonly Plugin[],
  ) {}

  outputDir(projectName: string): string {
    return join(this.workspaceRoot, 'backend', 'dist', projectName);
  }

  async bundle(app: AppBundle): Promise<string> {
    const outdir = this.outputDir(app.projectName);
    await rm(outdir, { recursive: true, force: true });
    await build({
      absWorkingDir: this.workspaceRoot,
      entryPoints: app.entryPoints.map((entry) => join(app.projectRoot, entry)),
      outdir,
      outbase: join(app.projectRoot, 'src'),
      tsconfig: join(this.workspaceRoot, 'backend', 'tsconfig.base.json'),
      bundle: true,
      packages: 'external',
      platform: 'node',
      format: 'esm',
      target: 'node24',
      outExtension: { '.js': '.mjs' },
      sourcemap: true,
      logLevel: 'warning',
      plugins: [...this.plugins],
    });
    return outdir;
  }
}
