import { format, resolveConfig } from 'prettier';
import { ArtifactRenderer } from './artifact-renderer.js';

/**
 * Formatea con la configuración de prettier del repositorio, así lo generado
 * pasa `nx format:check` sin otro paso. Prettier carga sus plugins con
 * `import()` dinámico y no corre dentro de jest: se prueba con `check`.
 */
export class PrettierArtifactRenderer extends ArtifactRenderer {
  async render(path: string, value: unknown): Promise<string> {
    const config = (await resolveConfig(path)) ?? {};
    return format(JSON.stringify(value), {
      ...config,
      parser: 'json',
      filepath: path,
    });
  }
}
