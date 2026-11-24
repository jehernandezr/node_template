import { parseArgs } from 'node:util';
import { GeneratorError, GeneratorErrorReason } from './generator-error.js';
import type { GeneratorOutput } from './generator-output.js';
import type { GeneratorSmoke } from './generator-smoke.js';
import type { ModuleGenerator } from './module-generator.js';
import type { ServiceGenerator } from './service-generator.js';
import type { SkeletonVerifier } from './skeleton-verifier.js';

/** Código de salida de la línea de comandos. */
export enum GeneratorExitCode {
  Success = 0,
  Failure = 1,
  Usage = 2,
}

/** Los subcomandos de `nx run generators:<subcomando>`. */
export enum GeneratorSubcommand {
  Service = 'service',
  Module = 'module',
  Verify = 'verify',
  Smoke = 'smoke',
}

/** Lee los argumentos, corre el generador pedido y traduce sus errores a un mensaje y un código de salida. */
export class GeneratorCommand {
  private static readonly USAGE = [
    'Uso:',
    '  service --name=<servicio>',
    '  module --service=<servicio> --name=<módulo>',
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
        this.output.info('Servicio generado. Agrega a mano:');
        lines.forEach((line) => this.output.info(`- ${line}`));
        return GeneratorExitCode.Success;
      }
      case GeneratorSubcommand.Module:
        await this.modules.generate(
          GeneratorCommand.required(values.service, 'service'),
          GeneratorCommand.required(values.name, 'name'),
        );
        this.output.info('Módulo generado.');
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
        'El servicio y el módulo generados pasan lint, test, typecheck y build.',
      );
      return GeneratorExitCode.Success;
    }
    this.output.error(
      `El servicio o el módulo generados no pasan sus targets (salida ${code}).`,
    );
    return GeneratorExitCode.Failure;
  }

  private async verify(): Promise<GeneratorExitCode> {
    const differences = await this.verifier.differences();
    if (differences.length === 0) {
      this.output.info(
        'La plantilla de servicio reproduce el esqueleto de tasks.',
      );
      return GeneratorExitCode.Success;
    }
    differences.forEach((path) =>
      this.output.error(`La plantilla de servicio no reproduce ${path}`),
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
        `Falta --${option}\n${GeneratorCommand.USAGE}`,
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
