import type { ArtifactWriter } from './artifact-writer.js';
import type { Artifact, ExportReport } from './artifact.type.js';
import type { AsyncApiBuilder } from './async-api-builder.js';
import type { OpenApiBuilder } from './open-api-builder.js';
import type { ContractRegistry } from './contract-registry.js';
import { ExportScope } from './export-constants.js';
import type { ExportPaths } from './export-paths.js';
import type { SchemaExportBuilder } from './schema-export-builder.js';
import type { TopologyBuilder } from './topology-builder.js';

/** Orchestrates the export: loads the contracts, builds the artifacts for the requested scope and hands them to the writer. */
export class ContractExporter {
  constructor(
    private readonly registry: ContractRegistry,
    private readonly schemas: SchemaExportBuilder,
    private readonly topology: TopologyBuilder,
    private readonly asyncApi: AsyncApiBuilder,
    private readonly openApi: OpenApiBuilder,
    private readonly paths: ExportPaths,
  ) {}

  /**
   * Loads the contracts and writes every artifact of the scope.
   * @param scope Services and artifacts to export.
   * @param writer Writer of the artifacts.
   * @returns What was written or found stale.
   */
  async run(scope: ExportScope, writer: ArtifactWriter): Promise<ExportReport> {
    const contracts = await this.registry.load();
    const topology: Artifact = {
      path: this.paths.topology,
      value: this.topology.build(contracts),
    };
    if (scope === ExportScope.TopologyOnly) {
      return writer.write([topology]);
    }
    const exported = [...this.schemas.build(contracts)];
    const openApiArtifacts: Artifact[] = exported.map(([service, value]) => ({
      path: this.paths.openApiOf(service),
      value: this.openApi.build(value),
    }));
    if (scope === ExportScope.OpenApiOnly) {
      return writer.write(openApiArtifacts);
    }
    const contractArtifacts: Artifact[] = exported.map(([service, value]) => ({
      path: this.paths.contractExportOf(service),
      value,
    }));
    return writer.write([
      ...contractArtifacts,
      ...openApiArtifacts,
      topology,
      { path: this.paths.asyncApi, value: this.asyncApi.build(contracts) },
    ]);
  }
}
