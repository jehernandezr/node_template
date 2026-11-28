import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import type { SharedPostgres } from '@platform/kernel/test-utils';

/** A role of the bootstrap event: a password from its secret, or IAM tokens only. */
export interface BootstrapUser {
  readonly name: string;
  readonly rds_iam?: boolean;
}

/** A database of the bootstrap event with its owner, writers and readers. */
export interface BootstrapDatabase {
  readonly name: string;
  readonly owner: string;
  readonly writers: readonly string[];
  readonly readers: readonly string[];
}

/**
 * Runs `bootstrap()` of the data stack bootstrap Lambda (`backend/infra/terraform/modules/rds-postgres/lambda/
 * db_bootstrap`) with `python3` against the test PostgreSQL, as its master user. Every password role gets the
 * password the test gives, standing in for its secret.
 */
export class DatabaseBootstrapLambda {
  private static readonly HANDLER_DIR = join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    '..',
    '..',
    'infra',
    'terraform',
    'modules',
    'rds-postgres',
    'lambda',
    'db_bootstrap',
  );

  private static readonly SCRIPT = [
    'import json, sys',
    'sys.path.insert(0, sys.argv[1])',
    'import handler',
    'event, server, password = json.loads(sys.argv[2]), json.loads(sys.argv[3]), sys.argv[4]',
    'def connect(dbname):',
    "    return handler.pg.Connection(user=server['username'], password=server['password'],",
    "        host=server['host'], port=server['port'], database=dbname, timeout=30)",
    "print(json.dumps(handler.bootstrap(event, server['username'], connect, lambda user: password)))",
  ].join('\n');

  constructor(
    private readonly server: SharedPostgres,
    private readonly password: string,
  ) {}

  /**
   * Creates the roles, the databases and their grants.
   * @param users Roles of the event.
   * @param databases Databases of the event.
   * @returns The summary the handler prints.
   * @throws Error with the handler output when it fails.
   */
  run(
    users: readonly BootstrapUser[],
    databases: readonly BootstrapDatabase[],
  ): unknown {
    const result = spawnSync(
      'python3',
      [
        '-B',
        '-I',
        '-c',
        DatabaseBootstrapLambda.SCRIPT,
        DatabaseBootstrapLambda.HANDLER_DIR,
        JSON.stringify({ users, databases }),
        JSON.stringify(this.server),
        this.password,
      ],
      { encoding: 'utf8' },
    );
    if (result.status !== 0) {
      throw new Error(`The bootstrap failed: ${result.stderr}`);
    }
    return JSON.parse(result.stdout);
  }
}
