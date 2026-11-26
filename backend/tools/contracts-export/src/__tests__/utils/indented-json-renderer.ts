import { ArtifactRenderer } from '../../artifact-renderer.js';

/** Deterministic renderer for tests: prettier does not run inside jest. */
export class IndentedJsonRenderer extends ArtifactRenderer {
  override render(_path: string, value: unknown): Promise<string> {
    return Promise.resolve(`${JSON.stringify(value, null, 2)}\n`);
  }
}
