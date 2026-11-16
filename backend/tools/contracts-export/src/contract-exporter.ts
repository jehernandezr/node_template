import type { ArtifactWriter } from './artifact-writer.js';
import type { Artifact, ExportReport } from './artifact.type.js';
import type { AsyncApiBuilder } from './async-api-builder.js';
import type { ContractRegistry } from './contract-registry.js';
import { ExportScope } from './export-constants.js';
import type { ExportPaths } from './export-paths.js';
import type { SchemaExportBuilder } from './schema-export-builder.js';
import type { TopologyBuilder } from './topology-builder.js';

/** Orquesta la exportación: carga los contratos, arma los artefactos del alcance pedido y los entrega al escritor. */
export class ContractExporter {
  constructor(
    private readonly registry: ContractRegistry,
    private readonly schemas: SchemaExportBuilder,
    private readonly topology: TopologyBuilder,
    private readonly asyncApi: AsyncApiBuilder,
    private readonly paths: ExportPaths,
  ) {}

  async run(scope: ExportScope, writer: ArtifactWriter): Promise<ExportReport> {
    const contracts = await this.registry.load();
    const topology: Artifact = {
      path: this.paths.topology,
      value: this.topology.build(contracts),
    };
    if (scope === ExportScope.TopologyOnly) {
      return writer.write([topology]);
    }
    const contractArtifacts: Artifact[] = [
      ...this.schemas.build(contracts),
    ].map(([service, value]) => ({
      path: this.paths.contractExportOf(service),
      value,
    }));
    return writer.write([
      ...contractArtifacts,
      topology,
      { path: this.paths.asyncApi, value: this.asyncApi.build(contracts) },
    ]);
  }
}
