import { parseArgs } from 'node:util';
import { GeneratorError, GeneratorErrorReason } from './generator-error.js';
import type { GeneratorOutput } from './generator-output.js';
import type { GeneratorSmoke } from './generator-smoke.js';
import type { ModuleGenerator } from './module-generator.js';
import type { ServiceGenerator } from './service-generator.js';
import type { SkeletonVerifier } from './skeleton-verifier.js';

/** Command line exit code. */
export enum GeneratorExitCode {
  Success = 0,
  Failure = 1,
  Usage = 2,
}

/** The subcommands of `nx run generators:<subcommand>`. */
export enum GeneratorSubcommand {
  Service = 'service',
  Module = 'module',
  Verify = 'verify',
  Smoke = 'smoke',
}

/** Reads the arguments, runs the requested generator and translates its errors into a message and an exit code. */
export class GeneratorCommand {
  private static readonly USAGE = [
    'Usage:',
    '  service --name=<service>',
    '  module --service=<service> --name=<module>',
    '  verify',
    '  smoke',
  ].join('\n');

  constructor(
    private readonly services: ServiceGenerator,
    private readonly modules: ModuleGenerator,
    private readonly verifier: SkeletonVerifier,
    private readonly smoke: GeneratorSmoke,
    private readonly output: GeneratorOutput,
  ) {}

  /**
   * Runs a generator from its command-line arguments.
   * @param args Arguments without the node and script paths.
   * @returns The exit code.
   */
  async run(args: readonly string[]): Promise<GeneratorExitCode> {
    try {
      return await this.dispatch(args);
    } catch (error) {
      if (!(error instanceof GeneratorError)) {
        throw error;
      }
      this.output.error(error.message);
      return error.reason === GeneratorErrorReason.InvalidArguments
        ? GeneratorExitCode.Usage
        : GeneratorExitCode.Failure;
    }
  }

  private async dispatch(args: readonly string[]): Promise<GeneratorExitCode> {
    const { positionals, values } = GeneratorCommand.parse(args);
    switch (positionals[0]) {
      case GeneratorSubcommand.Service: {
        const lines = await this.services.generate(
          GeneratorCommand.required(values.name, 'name'),
        );
        this.output.info('Service generated. Add by hand:');
        lines.forEach((line) => this.output.info(`- ${line}`));
        return GeneratorExitCode.Success;
      }
      case GeneratorSubcommand.Module:
        await this.modules.generate(
          GeneratorCommand.required(values.service, 'service'),
          GeneratorCommand.required(values.name, 'name'),
        );
        this.output.info('Module generated.');
        return GeneratorExitCode.Success;
      case GeneratorSubcommand.Verify:
        return this.verify();
      case GeneratorSubcommand.Smoke:
        return this.runSmoke();
      default:
        throw GeneratorCommand.usage();
    }
  }

  private async runSmoke(): Promise<GeneratorExitCode> {
    const code = await this.smoke.run();
    if (code === 0) {
      this.output.info(
        'The generated service and module pass lint, test, typecheck and build.',
      );
      return GeneratorExitCode.Success;
    }
    this.output.error(
      `The generated service or module do not pass their targets (exit ${code}).`,
    );
    return GeneratorExitCode.Failure;
  }

  private async verify(): Promise<GeneratorExitCode> {
    const differences = await this.verifier.differences();
    if (differences.length === 0) {
      this.output.info('The service template reproduces the tasks skeleton.');
      return GeneratorExitCode.Success;
    }
    differences.forEach((path) =>
      this.output.error(`The service template does not reproduce ${path}`),
    );
    return GeneratorExitCode.Failure;
  }

  private static parse(args: readonly string[]) {
    try {
      return parseArgs({
        args: [...args],
        allowPositionals: true,
        options: {
          name: { type: 'string' },
          service: { type: 'string' },
        },
      });
    } catch {
      throw GeneratorCommand.usage();
    }
  }

  private static required(value: string | undefined, option: string): string {
    if (value === undefined) {
      throw new GeneratorError(
        GeneratorErrorReason.InvalidArguments,
        `Missing --${option}\n${GeneratorCommand.USAGE}`,
      );
    }
    return value;
  }

  private static usage(): GeneratorError {
    return new GeneratorError(
      GeneratorErrorReason.InvalidArguments,
      GeneratorCommand.USAGE,
    );
  }
}
