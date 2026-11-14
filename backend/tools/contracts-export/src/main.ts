import { AsyncApiBuilder } from './async-api-builder.js';
import { ConsoleOutput } from './console-output.js';
import { ContractExporter } from './contract-exporter.js';
import { ContractsDiscovery } from './contracts-discovery.js';
import { ExportCommand } from './export-command.js';
import { ExitCode } from './export-constants.js';
import { ExportPaths } from './export-paths.js';
import { GlobalUniquenessChecker } from './global-uniqueness-checker.js';
import { NodeFileSystem } from './node-file-system.js';
import { NodeModuleLoader } from './node-module-loader.js';
import { PrettierArtifactRenderer } from './prettier-artifact-renderer.js';
import { SchemaExportBuilder } from './schema-export-builder.js';
import { SchemaOwnership } from './schema-ownership.js';
import { TopologyBuilder } from './topology-builder.js';

/** Punto de entrada de la línea de comandos: arma las piezas y ejecuta el subcomando. */
async function main(args: readonly string[]): Promise<ExitCode> {
  const paths = new ExportPaths(process.cwd());
  const fileSystem = new NodeFileSystem();
  const ownership = new SchemaOwnership();
  const uniqueness = new GlobalUniquenessChecker();
  const topology = new TopologyBuilder(uniqueness);
  const exporter = new ContractExporter(
    new ContractsDiscovery(paths, fileSystem, new NodeModuleLoader()),
    new SchemaExportBuilder(ownership, uniqueness),
    topology,
    new AsyncApiBuilder(ownership, topology),
    paths,
  );
  const command = new ExportCommand(
    exporter,
    new PrettierArtifactRenderer(),
    fileSystem,
    new ConsoleOutput(),
  );
  return command.run(args);
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(error);
    process.exitCode = ExitCode.Failure;
  },
);
