import type { Artifact, ExportReport } from './artifact.type.js';
import type { ArtifactRenderer } from './artifact-renderer.js';
import type { ExportMode } from './export-mode.js';

/** Da formato a cada artefacto y se lo entrega al modo, que decide si lo escribe o lo compara. */
export class ArtifactWriter {
  constructor(
    private readonly renderer: ArtifactRenderer,
    private readonly mode: ExportMode,
  ) {}

  async write(artifacts: readonly Artifact[]): Promise<ExportReport> {
    for (const artifact of artifacts) {
      const content = await this.renderer.render(artifact.path, artifact.value);
      await this.mode.apply(artifact.path, content);
    }
    return this.mode.report();
  }
}
