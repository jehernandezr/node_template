import { resolve } from 'node:path';
import type { DatabaseSetDefinition } from '../model/database-set-definition.js';
import type { MigrationGenerator } from '../migration-generator.js';

/** Options accepted by the command, with the name used to write them on the command line. */
enum CliOption {
  Name = 'name',
  Definition = 'definition',
  Out = 'out',
}

/** Environment variables with the connection to the server where the temporary database is created. */
enum CliEnv {
  Host = 'MIGRATION_DB_HOST',
  Port = 'MIGRATION_DB_PORT',
  User = 'MIGRATION_DB_USER',
  Password = 'MIGRATION_DB_PASSWORD',
}

const USAGE =
  'Usage: migration-generate --name=<Name> --definition=<module with export default DatabaseSetDefinition> --out=<folder> (connection in MIGRATION_DB_HOST, MIGRATION_DB_PORT, MIGRATION_DB_USER, MIGRATION_DB_PASSWORD)';

const EXIT_OK = 0;
const EXIT_ERROR = 1;
const EXIT_USAGE = 2;

/** Already validated command-line arguments. */
interface CliArguments {
  readonly name: string;
  readonly definition: string;
  readonly out: string;
}

/** `migration-generate` CLI command: reads the arguments, loads the definition and calls the generator. */
export class MigrationGenerateCommand {
  constructor(
    private readonly generator: MigrationGenerator,
    private readonly env: Readonly<Record<string, string | undefined>>,
    private readonly write: (text: string) => void,
  ) {}

  /**
   * Generates a migration from the entity changes of a project.
   * @returns the exit code: 0 on success or no changes, 1 on an error, 2 on incorrect usage.
   * @param argv Arguments without the node and script paths.
   */
  async run(argv: readonly string[]): Promise<number> {
    const options = this.parse(argv);
    const user = this.env[CliEnv.User];
    const password = this.env[CliEnv.Password];
    if (options === undefined || user === undefined || password === undefined) {
      this.write(USAGE);
      return EXIT_USAGE;
    }

    try {
      const definition = await this.loadDefinition(options.definition);
      if (definition === undefined) {
        this.write(
          'The definition does not default-export a DatabaseSetDefinition',
        );
        return EXIT_USAGE;
      }
      const path = await this.generator.generate({
        name: options.name,
        outputDir: options.out,
        definition,
        server: {
          host: this.env[CliEnv.Host] ?? 'localhost',
          port: Number(this.env[CliEnv.Port] ?? '5432'),
        },
        user,
        password,
      });
      if (path === null) {
        this.write('No changes: the entities match the migrations');
        return EXIT_OK;
      }
      this.write(`Migration generated: ${path}`);
      return EXIT_OK;
    } catch (error) {
      this.write(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return EXIT_ERROR;
    }
  }

  /** The arguments are `--key=value`, exactly once each; any other input is a usage error. */
  private parse(argv: readonly string[]): CliArguments | undefined {
    const values = new Map<string, string>();
    for (const arg of argv) {
      const match = /^--(name|definition|out)=(.+)$/.exec(arg);
      if (match === null || match[1] === undefined || match[2] === undefined) {
        return undefined;
      }
      values.set(match[1], match[2]);
    }
    const name = values.get(CliOption.Name);
    const definition = values.get(CliOption.Definition);
    const out = values.get(CliOption.Out);
    if (name === undefined || definition === undefined || out === undefined) {
      return undefined;
    }
    return { name, definition, out };
  }

  /** Takes the module `default`, or `undefined` if it does not have the shape of a `DatabaseSetDefinition`. */
  private async loadDefinition(
    path: string,
  ): Promise<DatabaseSetDefinition | undefined> {
    const loaded: unknown = await import(resolve(path));
    const fallback = MigrationGenerateCommand.isModuleWithDefault(loaded)
      ? loaded.default
      : undefined;
    return MigrationGenerateCommand.isDatabaseSetDefinition(fallback)
      ? fallback
      : undefined;
  }

  private static isModuleWithDefault(
    value: unknown,
  ): value is { default: unknown } {
    return typeof value === 'object' && value !== null && 'default' in value;
  }

  private static isDatabaseSetDefinition(
    value: unknown,
  ): value is DatabaseSetDefinition {
    return (
      typeof value === 'object' &&
      value !== null &&
      'entities' in value &&
      Array.isArray(value.entities) &&
      'migrations' in value &&
      Array.isArray(value.migrations)
    );
  }
}
