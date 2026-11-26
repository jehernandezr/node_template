import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ArtifactSmoke, SmokeEnvironment } from './artifact-smoke.mjs';

/**
 * The settings of `backend/infra/local/smoke.env`: the fixed local smoke account and the gateway port. They are
 * read here, not by the services: only the seed receives the account.
 */
export class LocalSmokeSettings {
  static FILE = 'backend/infra/local/smoke.env';

  /**
   * @param {string} root Repository root.
   */
  constructor(root) {
    this.path = join(root, LocalSmokeSettings.FILE);
    this.values = LocalSmokeSettings.parse(readFileSync(this.path, 'utf8'));
    for (const name of ['SMOKE_ACCOUNT', 'SMOKE_GATEWAY_PORT']) {
      if (!this.values[name]) {
        throw new Error(`${LocalSmokeSettings.FILE} has no ${name}`);
      }
    }
  }

  /**
   * Reads `NAME=value` lines, skipping blank lines and `#` comments; the value is the rest of the line.
   * @param {string} text File text.
   * @returns {Record<string, string>} The values by name.
   */
  static parse(text) {
    return Object.fromEntries(
      text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '' && !line.startsWith('#'))
        .map((line) => {
          const equals = line.indexOf('=');
          return [line.slice(0, equals), line.slice(equals + 1)];
        }),
    );
  }

  /**
   * The base URL the gateway publishes on this machine.
   * @returns {string} The URL.
   */
  baseUrl() {
    return `http://127.0.0.1:${this.values.SMOKE_GATEWAY_PORT}`;
  }
}

/**
 * Runs the deploy smoke suite against the local smoke stack of `backend/infra/local/smoke.compose.yml`: it builds the
 * image of each service, starts PostgreSQL, Valkey and LocalStack, migrates each service, starts its API and worker
 * behind the gateway, and then twice seeds identity with the smoke account and runs the suite, so the second round
 * proves the seed is idempotent and resets the account. It removes its compose project, volumes included, and the
 * images it built, even on failure.
 */
export class LocalSmoke {
  static COMPOSE = 'backend/infra/local/smoke.compose.yml';
  static SUITE_CONFIG = 'backend/e2e/deploy-smoke/jest.smoke.config.cjs';
  static JEST = 'node_modules/.bin/jest';
  static SEED_PROFILE = 'seed';
  static SEED_SERVICE = 'identity-seed';
  static ROUNDS = 2;
  static READY_URL = 'http://127.0.0.1:3000/health/ready';
  static LOCALSTACK_READY = 'http://localhost:4566/_localstack/init/ready';
  static PROBE_ATTEMPTS = 90;
  static PROBE_DELAY_MS = 2_000;
  static LOG_LINES = '60';
  static SECRETS = {
    SMOKE_INTERNAL_API_SHARED_SECRET: 'INTERNAL_API_SHARED_SECRET',
    SMOKE_IDENTITY_EMAIL_PEPPER: 'IDENTITY_EMAIL_PEPPER',
    SMOKE_IDENTITY_TOKEN_PEPPER: 'IDENTITY_TOKEN_PEPPER',
    SMOKE_IDENTITY_API_KEY_PEPPER: 'IDENTITY_API_KEY_PEPPER',
    SMOKE_IDENTITY_DEVICE_ID_KEY: 'IDENTITY_DEVICE_ID_KEY',
    SMOKE_IDENTITY_DATA_KEY: 'IDENTITY_DATA_KEY',
    SMOKE_NOTIFICATIONS_EMAIL_PEPPER: 'NOTIFICATIONS_EMAIL_PEPPER',
  };

  /**
   * @param {{ root: string, project: string, services: string[], settings: LocalSmokeSettings,
   *   runner: import('./artifact-smoke.mjs').CommandRunner, sleeper: import('./artifact-smoke.mjs').Sleeper,
   *   log: (line: string) => void, env?: NodeJS.ProcessEnv }} options What to run and how.
   */
  constructor(options) {
    this.root = options.root;
    this.project = options.project;
    this.services = options.services;
    this.settings = options.settings;
    this.runner = options.runner;
    this.sleeper = options.sleeper;
    this.log = options.log;
    this.images = [];
    this.env = {
      ...(options.env ?? process.env),
      SMOKE_IMAGE_PREFIX: this.project,
      SMOKE_DB_PASSWORD: SmokeEnvironment.secret(),
      SMOKE_IDENTITY_SIGNING_KEYS: SmokeEnvironment.signingKeys(),
      ...Object.fromEntries(
        Object.keys(LocalSmoke.SECRETS).map((name) => [
          name,
          SmokeEnvironment.secret(),
        ]),
      ),
    };
  }

  /**
   * Runs the whole local smoke and cleans up whatever it started.
   * @returns {number} 0 when both rounds passed, 1 otherwise.
   */
  run() {
    try {
      for (const service of this.services) this.buildImage(service);
      this.startDependencies();
      for (const service of this.services) this.migrate(service);
      this.startServices();
      for (let round = 1; round <= LocalSmoke.ROUNDS; round += 1) {
        this.log(`== round ${round}: seed and deploy-smoke`);
        this.seed();
        this.runSuite();
      }
      this.log('The deploy smoke suite passed twice against the local stack.');
      return 0;
    } catch (error) {
      this.log(`Local smoke failed: ${error.message}`);
      return 1;
    } finally {
      this.cleanUp();
    }
  }

  /**
   * Builds the image of a service with the tag the compose file expects.
   * @param {string} service App name.
   */
  buildImage(service) {
    const image = `${this.project}/${service}:smoke`;
    this.log(`== build ${image}`);
    this.docker([
      'build',
      '-f',
      ArtifactSmoke.DOCKERFILE,
      '--platform',
      ArtifactSmoke.PLATFORM,
      '--build-arg',
      `SERVICE=${service}`,
      '-t',
      image,
      '.',
    ]);
    this.images.push(image);
  }

  /** Starts PostgreSQL, Valkey and LocalStack and waits until they accept work. */
  startDependencies() {
    this.compose(['up', '-d', 'postgres', 'valkey', 'localstack']);
    this.until('PostgreSQL', () =>
      this.probe([
        'exec',
        '-T',
        'postgres',
        'pg_isready',
        '-h',
        '127.0.0.1',
        '-U',
        SmokeEnvironment.DATABASE_USER,
      ]),
    );
    this.until('Valkey', () =>
      this.probe(['exec', '-T', 'valkey', 'valkey-cli', 'ping']),
    );
    this.until('the LocalStack topology', () => {
      const result = this.runner.run(
        'docker',
        this.composeArgs([
          'exec',
          '-T',
          'localstack',
          'curl',
          '-fs',
          LocalSmoke.LOCALSTACK_READY,
        ]),
        { cwd: this.root, env: this.env },
      );
      return result.status === 0 && /"completed":\s*true/.test(result.stdout);
    });
  }

  /**
   * Migrates the catalog of a service, records its shards in the catalog directory and migrates them.
   * @param {string} service App name.
   */
  migrate(service) {
    this.runMigrate(service);
    const { catalog, shards } = SmokeEnvironment.databases(service);
    const rows = shards
      .map((shard) => `('${shard}', '${SmokeEnvironment.INSTANCE}', now())`)
      .join(', ');
    this.compose([
      'exec',
      '-T',
      'postgres',
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      SmokeEnvironment.DATABASE_USER,
      '-d',
      catalog,
      '-qc',
      `INSERT INTO shard_instances (logical_shard, instance, updated_at) VALUES ${rows} ON CONFLICT DO NOTHING`,
    ]);
    this.runMigrate(service);
    this.log(`${service}: catalog and shards migrated`);
  }

  /** Starts every API, worker and the gateway, and waits until each API answers `HealthRoute.Ready`. */
  startServices() {
    this.compose([
      'up',
      '-d',
      ...this.services.flatMap((service) => [service, `${service}-worker`]),
      'gateway',
    ]);
    for (const service of this.services) {
      this.until(
        `${service} /health/ready`,
        () =>
          this.probe([
            'exec',
            '-T',
            service,
            'node',
            '-e',
            `fetch('${LocalSmoke.READY_URL}').then((r) => process.exit(r.status === 200 ? 0 : 1), () => process.exit(1))`,
          ]),
        service,
      );
    }
  }

  /** Runs identity's seed with the smoke account, as the deploy does after the last service. */
  seed() {
    this.compose([
      '--profile',
      LocalSmoke.SEED_PROFILE,
      'run',
      '--rm',
      '--no-deps',
      LocalSmoke.SEED_SERVICE,
    ]);
  }

  /** Runs the deploy-smoke suite against the gateway with the smoke account, writing its report to this output. */
  runSuite() {
    const result = this.runner.run(
      join(this.root, LocalSmoke.JEST),
      ['--config', LocalSmoke.SUITE_CONFIG, '--runInBand'],
      {
        cwd: this.root,
        env: {
          ...this.env,
          SMOKE_BASE_URL: this.settings.baseUrl(),
          SMOKE_ACCOUNT: this.settings.values.SMOKE_ACCOUNT,
        },
        inherit: true,
      },
    );
    if (result.status !== 0) {
      throw new Error(`the deploy-smoke suite exited ${result.status}`);
    }
  }

  /**
   * Runs `node migrate.mjs all` in a one-off container of the service.
   * @param {string} service App name.
   */
  runMigrate(service) {
    this.compose([
      'run',
      '--rm',
      '--no-deps',
      service,
      'node',
      'migrate.mjs',
      'all',
    ]);
  }

  /**
   * The compose arguments for this project, file and settings, followed by a command.
   * @param {string[]} args Compose command and its arguments.
   * @returns {string[]} Arguments of `docker`.
   */
  composeArgs(args) {
    return [
      'compose',
      '-p',
      this.project,
      '-f',
      join(this.root, LocalSmoke.COMPOSE),
      '--env-file',
      this.settings.path,
      ...args,
    ];
  }

  /**
   * Runs a compose command and throws when it fails.
   * @param {string[]} args Compose command and its arguments.
   * @returns {string} Its output.
   */
  compose(args) {
    return this.docker(this.composeArgs(args));
  }

  /**
   * Runs a docker command from the repository root with the generated secrets and throws when it fails.
   * @param {string[]} args Docker arguments.
   * @returns {string} Its output.
   */
  docker(args) {
    const result = this.runner.run('docker', args, {
      cwd: this.root,
      env: this.env,
    });
    if (result.status !== 0) {
      throw new Error(
        `docker ${args.join(' ').slice(0, 160)} failed\n${result.stdout}${result.stderr}`,
      );
    }
    return result.stdout;
  }

  /**
   * Runs a compose command and reports whether it exited 0.
   * @param {string[]} args Compose command and its arguments.
   * @returns {boolean} Whether it passed.
   */
  probe(args) {
    return (
      this.runner.run('docker', this.composeArgs(args), {
        cwd: this.root,
        env: this.env,
      }).status === 0
    );
  }

  /**
   * Repeats a probe until it passes.
   * @param {string} what What is awaited, for the error.
   * @param {() => boolean} probe Returns true once ready.
   * @param {string} [service] Service whose last log lines the error carries.
   * @throws Error when it never passes.
   */
  until(what, probe, service) {
    for (let attempt = 0; attempt < LocalSmoke.PROBE_ATTEMPTS; attempt += 1) {
      if (probe()) return;
      this.sleeper.sleep(LocalSmoke.PROBE_DELAY_MS);
    }
    const logs =
      service === undefined
        ? undefined
        : this.runner.run(
            'docker',
            this.composeArgs(['logs', '--tail', LocalSmoke.LOG_LINES, service]),
            { cwd: this.root, env: this.env },
          );
    throw new Error(
      `${what} was not ready after ${LocalSmoke.PROBE_ATTEMPTS} attempts${logs === undefined ? '' : `\n${logs.stdout}${logs.stderr}`}`,
    );
  }

  /** Removes the compose project with its volumes, and the images it built, by name. */
  cleanUp() {
    this.runner.run(
      'docker',
      this.composeArgs([
        '--profile',
        LocalSmoke.SEED_PROFILE,
        'down',
        '-v',
        '--remove-orphans',
      ]),
      { cwd: this.root, env: this.env },
    );
    for (const image of this.images) {
      this.runner.run('docker', ['rmi', image], { cwd: this.root });
    }
  }
}
