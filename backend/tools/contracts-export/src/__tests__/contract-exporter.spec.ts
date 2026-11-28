import { ArtifactWriter } from '../artifact-writer.js';
import { AsyncApiBuilder } from '../async-api-builder.js';
import { ContractExporter } from '../contract-exporter.js';
import { DatabaseConfigExportBuilder } from '../database-config-export-builder.js';
import { OpenApiBuilder } from '../open-api-builder.js';
import { ExportScope } from '../export-constants.js';
import { ExportPaths } from '../export-paths.js';
import { GlobalUniquenessChecker } from '../global-uniqueness-checker.js';
import { SchemaExportBuilder } from '../schema-export-builder.js';
import { SchemaOwnership } from '../schema-ownership.js';
import { TopologyBuilder } from '../topology-builder.js';
import { WriteMode } from '../write-mode.js';
import { ContractFixtures } from './utils/contract-fixtures.js';
import { IndentedJsonRenderer } from './utils/indented-json-renderer.js';
import { InMemoryFileSystem } from './utils/in-memory-file-system.js';
import { StaticContractRegistry } from './utils/static-contract-registry.js';

const paths = new ExportPaths('/backend');

describe('ContractExporter', () => {
  describe('run', () => {
    it('writes every contract, the topology and the asyncapi with the full scope', async () => {
      const fileSystem = new InMemoryFileSystem();
      const uniqueness = new GlobalUniquenessChecker();
      const topology = new TopologyBuilder(uniqueness);
      const exporter = new ContractExporter(
        new StaticContractRegistry(ContractFixtures.registered()),
        new SchemaExportBuilder(new SchemaOwnership(), uniqueness),
        topology,
        new AsyncApiBuilder(new SchemaOwnership(), topology),
        new OpenApiBuilder(),
        paths,
        new DatabaseConfigExportBuilder(),
      );

      const report = await exporter.run(
        ExportScope.All,
        new ArtifactWriter(
          new IndentedJsonRenderer(),
          new WriteMode(fileSystem),
        ),
      );

      expect(
        fileSystem.contentOf(paths.contractExportOf('platform')),
      ).toBeDefined();
      expect(
        fileSystem.contentOf(paths.contractExportOf('identity')),
      ).toBeDefined();
      expect(fileSystem.contentOf(paths.topology)).toBeDefined();
      expect(fileSystem.contentOf(paths.asyncApi)).toBeDefined();
      expect(
        JSON.parse(fileSystem.contentOf(paths.databaseConfig) ?? '{}'),
      ).toEqual(new DatabaseConfigExportBuilder().build());
      expect(report).toEqual({
        ok: true,
        lines: [
          `Wrote ${paths.contractExportOf('platform')}`,
          `Wrote ${paths.contractExportOf('identity')}`,
          `Wrote ${paths.contractExportOf('billing')}`,
          `Wrote ${paths.openApiOf('platform')}`,
          `Wrote ${paths.openApiOf('identity')}`,
          `Wrote ${paths.openApiOf('billing')}`,
          `Wrote ${paths.topology}`,
          `Wrote ${paths.asyncApi}`,
          `Wrote ${paths.databaseConfig}`,
        ],
      });
    });

    it('writes only the topology with the topology-only scope', async () => {
      const fileSystem = new InMemoryFileSystem();
      const uniqueness = new GlobalUniquenessChecker();
      const topology = new TopologyBuilder(uniqueness);
      const exporter = new ContractExporter(
        new StaticContractRegistry(ContractFixtures.registered()),
        new SchemaExportBuilder(new SchemaOwnership(), uniqueness),
        topology,
        new AsyncApiBuilder(new SchemaOwnership(), topology),
        new OpenApiBuilder(),
        paths,
        new DatabaseConfigExportBuilder(),
      );

      const report = await exporter.run(
        ExportScope.TopologyOnly,
        new ArtifactWriter(
          new IndentedJsonRenderer(),
          new WriteMode(fileSystem),
        ),
      );

      expect(fileSystem.contentOf(paths.topology)).toBeDefined();
      expect(fileSystem.contentOf(paths.asyncApi)).toBeUndefined();
      expect(report).toEqual({
        ok: true,
        lines: [`Wrote ${paths.topology}`],
      });
    });

    it('writes only the OpenAPI of each contract with the openapi-only scope', async () => {
      const fileSystem = new InMemoryFileSystem();
      const uniqueness = new GlobalUniquenessChecker();
      const topology = new TopologyBuilder(uniqueness);
      const exporter = new ContractExporter(
        new StaticContractRegistry(ContractFixtures.registered()),
        new SchemaExportBuilder(new SchemaOwnership(), uniqueness),
        topology,
        new AsyncApiBuilder(new SchemaOwnership(), topology),
        new OpenApiBuilder(),
        paths,
        new DatabaseConfigExportBuilder(),
      );

      const report = await exporter.run(
        ExportScope.OpenApiOnly,
        new ArtifactWriter(
          new IndentedJsonRenderer(),
          new WriteMode(fileSystem),
        ),
      );

      expect(report.lines).toEqual([
        `Wrote ${paths.openApiOf('platform')}`,
        `Wrote ${paths.openApiOf('identity')}`,
        `Wrote ${paths.openApiOf('billing')}`,
      ]);
      expect(
        fileSystem.contentOf(paths.contractExportOf('identity')),
      ).toBeUndefined();
      expect(
        JSON.parse(fileSystem.contentOf(paths.openApiOf('identity')) ?? '{}'),
      ).toMatchObject({ openapi: '3.1.0', info: { title: 'identity' } });
    });
  });
});
