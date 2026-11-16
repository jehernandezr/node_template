import { ArtifactRenderer } from '../../artifact-renderer.js';

/** Renderer determinista para pruebas: prettier no corre dentro de jest. */
export class IndentedJsonRenderer extends ArtifactRenderer {
  render(_path: string, value: unknown): Promise<string> {
    return Promise.resolve(`${JSON.stringify(value, null, 2)}\n`);
  }
}
