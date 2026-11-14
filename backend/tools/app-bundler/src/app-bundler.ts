import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { build, type Plugin } from 'esbuild';

export interface AppBundle {
  /** Nombre del proyecto de Nx; da nombre a la carpeta de salida. */
  readonly projectName: string;
  /** Carpeta del proyecto, relativa a la raíz del repositorio. */
  readonly projectRoot: string;
  /** Entradas relativas a `projectRoot`. */
  readonly entryPoints: readonly string[];
}

/**
 * Empaqueta una app del backend en `backend/dist/<app>/`. Las librerías del repositorio
 * entran al paquete por sus alias de TypeScript; las dependencias de node_modules quedan
 * externas y se instalan en la imagen con el package.json del backend.
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
