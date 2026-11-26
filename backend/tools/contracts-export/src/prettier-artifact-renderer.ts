import { format, resolveConfig } from 'prettier';
import { ArtifactRenderer } from './artifact-renderer.js';

/**
 * Formats with the repository prettier configuration, so the generated output
 * passes `nx format:check` with no extra step. Prettier loads its plugins with
 * dynamic `import()` and does not run inside jest: it is tested with `check`.
 */
export class PrettierArtifactRenderer extends ArtifactRenderer {
  override async render(path: string, value: unknown): Promise<string> {
    const config = (await resolveConfig(path)) ?? {};
    return format(JSON.stringify(value), {
      ...config,
      parser: 'json',
      filepath: path,
    });
  }
}
