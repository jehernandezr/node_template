import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConsoleOutput } from './console-output.js';
import { GeneratedFileWriter } from './generated-file-writer.js';
import { GeneratorCommand, GeneratorExitCode } from './generator-command.js';
import { GeneratorSmoke } from './generator-smoke.js';
import { ModuleGenerator } from './module-generator.js';
import { NodeCommandRunner } from './node-command-runner.js';
import { NodeFileSystem } from './node-file-system.js';
import { NodeWorkspaceCopier } from './node-workspace-copier.js';
import { PrettierFormatter } from './prettier-formatter.js';
import { ServiceGenerator } from './service-generator.js';
import { SkeletonVerifier } from './skeleton-verifier.js';
import { TemplateRenderer } from './template-renderer.js';
import { TemplateSource } from './template-source.js';

/** Command line entry point: assembles the pieces over the disk and runs the subcommand. */
async function main(args: readonly string[]): Promise<GeneratorExitCode> {
  const files = new NodeFileSystem();
  const templates = new TemplateSource(
    files,
    join(dirname(fileURLToPath(import.meta.url)), '..', 'templates'),
  );
  const renderer = new TemplateRenderer();
  const writer = new GeneratedFileWriter(
    files,
    new PrettierFormatter(),
    process.cwd(),
  );
  const services = new ServiceGenerator(templates, renderer, writer);
  return new GeneratorCommand(
    services,
    new ModuleGenerator(templates, renderer, writer),
    new SkeletonVerifier(templates, services, writer),
    new GeneratorSmoke(
      new NodeWorkspaceCopier(join(process.cwd(), '..')),
      new NodeCommandRunner(),
      files,
    ),
    new ConsoleOutput(),
  ).run(args);
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(error);
    process.exitCode = GeneratorExitCode.Failure;
  },
);
