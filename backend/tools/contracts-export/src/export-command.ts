import { ArtifactWriter } from './artifact-writer.js';
import type { ArtifactRenderer } from './artifact-renderer.js';
import { CheckMode } from './check-mode.js';
import type { ContractExporter } from './contract-exporter.js';
import {
  ExitCode,
  ExportCommandName,
  ExportScope,
} from './export-constants.js';
import type { ExportMode } from './export-mode.js';
import type { FileSystem } from './file-system.js';
import type { Output } from './output.js';
import { WriteMode } from './write-mode.js';

const USAGE =
  'Uso: contracts-export <export|check|topology-export|topology-check|openapi>';

/** Interpreta el subcomando, elige modo y alcance y devuelve el código de salida. */
export class ExportCommand {
  constructor(
    private readonly exporter: ContractExporter,
    private readonly renderer: ArtifactRenderer,
    private readonly fileSystem: FileSystem,
    private readonly output: Output,
  ) {}

  async run(args: readonly string[]): Promise<ExitCode> {
    const selection = this.selectionOf(args[0]);
    if (selection === null) {
      this.output.error(USAGE);
      return ExitCode.Usage;
    }
    const report = await this.exporter.run(
      selection.scope,
      new ArtifactWriter(this.renderer, selection.mode),
    );
    for (const line of report.lines) {
      if (report.ok) {
        this.output.info(line);
      } else {
        this.output.error(line);
      }
    }
    return report.ok ? ExitCode.Success : ExitCode.Failure;
  }

  private selectionOf(
    name: string | undefined,
  ): { readonly mode: ExportMode; readonly scope: ExportScope } | null {
    switch (name) {
      case ExportCommandName.Export:
        return {
          mode: new WriteMode(this.fileSystem),
          scope: ExportScope.All,
        };
      case ExportCommandName.Check:
        return {
          mode: new CheckMode(this.fileSystem),
          scope: ExportScope.All,
        };
      case ExportCommandName.TopologyExport:
        return {
          mode: new WriteMode(this.fileSystem),
          scope: ExportScope.TopologyOnly,
        };
      case ExportCommandName.TopologyCheck:
        return {
          mode: new CheckMode(this.fileSystem),
          scope: ExportScope.TopologyOnly,
        };
      case ExportCommandName.OpenApi:
        return {
          mode: new WriteMode(this.fileSystem),
          scope: ExportScope.OpenApiOnly,
        };
      default:
        return null;
    }
  }
}
