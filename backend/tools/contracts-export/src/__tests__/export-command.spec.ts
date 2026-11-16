import { AsyncApiBuilder } from '../async-api-builder.js';
import { ContractExporter } from '../contract-exporter.js';
import { ExportCommand } from '../export-command.js';
import { ExitCode } from '../export-constants.js';
import { ExportPaths } from '../export-paths.js';
import { GlobalUniquenessChecker } from '../global-uniqueness-checker.js';
import type { Output } from '../output.js';
import { SchemaExportBuilder } from '../schema-export-builder.js';
import { SchemaOwnership } from '../schema-ownership.js';
import { TopologyBuilder } from '../topology-builder.js';
import type { FileSystem } from '../file-system.js';
import { ContractFixtures } from './utils/contract-fixtures.js';
import { IndentedJsonRenderer } from './utils/indented-json-renderer.js';
import { InMemoryFileSystem } from './utils/in-memory-file-system.js';
import { RecordingOutput } from './utils/recording-output.js';
import { StaticContractRegistry } from './utils/static-contract-registry.js';

const paths = new ExportPaths('/backend');
const USAGE =
  'Uso: contracts-export <export|check|topology-export|topology-check>';
const UP_TO_DATE = 'Archivos generados al día.';

/** Comando con el exportador real de los contratos registrados, sobre el disco dado. */
function commandOver(fileSystem: FileSystem, output: Output): ExportCommand {
  const uniqueness = new GlobalUniquenessChecker();
  const topology = new TopologyBuilder(uniqueness);
  const exporter = new ContractExporter(
    new StaticContractRegistry(ContractFixtures.registered()),
    new SchemaExportBuilder(new SchemaOwnership(), uniqueness),
    topology,
    new AsyncApiBuilder(new SchemaOwnership(), topology),
    paths,
  );
  return new ExportCommand(
    exporter,
    new IndentedJsonRenderer(),
    fileSystem,
    output,
  );
}

describe('ExportCommand', () => {
  let fileSystem: InMemoryFileSystem;
  let output: RecordingOutput;
  let command: ExportCommand;

  beforeEach(() => {
    fileSystem = new InMemoryFileSystem();
    output = new RecordingOutput();
    command = commandOver(fileSystem, output);
  });

  describe('run', () => {
    it.each<[string, string[]]>([
      ['an unknown subcommand', ['publish']],
      ['no subcommand', []],
    ])('rejects %s with the usage line', async (_label, args) => {
      const code = await command.run(args);

      expect(code).toBe(ExitCode.Usage);
      expect(output.errorLines).toEqual([USAGE]);
    });

    it('export writes the four generated files', async () => {
      const code = await command.run(['export']);

      expect(code).toBe(ExitCode.Success);
      expect(
        fileSystem.contentOf(paths.contractExportOf('platform')),
      ).toBeDefined();
      expect(
        fileSystem.contentOf(paths.contractExportOf('identity')),
      ).toBeDefined();
      expect(fileSystem.contentOf(paths.topology)).toBeDefined();
      expect(fileSystem.contentOf(paths.asyncApi)).toBeDefined();
      expect(output.infoLines).toHaveLength(4);
    });

    it('check passes when the files match the contracts', async () => {
      await commandOver(fileSystem, new RecordingOutput()).run(['export']);

      const code = await command.run(['check']);

      expect(code).toBe(ExitCode.Success);
      expect(output.infoLines).toEqual([UP_TO_DATE]);
    });

    it('check fails and names the file that drifted', async () => {
      await commandOver(fileSystem, new RecordingOutput()).run(['export']);
      await fileSystem.write(paths.topology, '{}\n');

      const code = await command.run(['check']);

      expect(code).toBe(ExitCode.Failure);
      expect(output.errorLines[0]).toContain(`  ${paths.topology}`);
    });

    it('topology-export writes only topology.json', async () => {
      const code = await command.run(['topology-export']);

      expect(code).toBe(ExitCode.Success);
      expect(fileSystem.contentOf(paths.topology)).toBeDefined();
      expect(fileSystem.contentOf(paths.asyncApi)).toBeUndefined();
      expect(
        fileSystem.contentOf(paths.contractExportOf('platform')),
      ).toBeUndefined();
    });

    it('topology-check fails without files and names only topology.json', async () => {
      const code = await command.run(['topology-check']);

      expect(code).toBe(ExitCode.Failure);
      expect(output.errorLines).toHaveLength(1);
      expect(output.errorLines[0]).toContain(paths.topology);
      expect(output.errorLines[0]).not.toContain(paths.asyncApi);
    });
  });
});
