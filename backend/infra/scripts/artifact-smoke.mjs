import { spawnSync } from 'node:child_process';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Runs a command and returns its exit code and output, without throwing on a non-zero exit. */
export class CommandRunner {
  /**
   * @param {string} command Executable.
   * @param {string[]} args Arguments.
   * @param {{ cwd?: string }} [options] Working directory.
   * @returns {{ status: number, stdout: string, stderr: string }} The result.
   */
  run(command, args, options = {}) {
    const result = spawnSync(command, args, {
      cwd: options.cwd,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.error) throw result.error;
    return {
      status: result.status ?? 1,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }
}

/** Waits between readiness probes. */
export class Sleeper {
  /**
   * @param {number} ms Milliseconds to wait.
   */
  sleep(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  }
}

/**
 * The deployable backend services and the entry points each bundle must hold: every app with a `migrate` entry, with
 * the entries its `build` target passes to the bundler.
 */
export class ServiceArtifacts {
  static REQUIRED_ENTRIES = ['main', 'worker', 'lambda', 'migrate'];
  static ENTRY = /--entry=src\/([\w-]+)\.ts/g;

  /**
   * @param {string} root Repository root.
   */
  constructor(root) {
    this.root = root;
  }

  /**
   * The services, sorted by name.
   * @returns {string[]} App names.
   */
  services() {
    const apps = join(this.root, 'backend/apps');
    return readdirSync(apps)
      .filter((app) => existsSync(join(apps, app, 'src/migrate.ts')))
      .sort();
  }

  /**
   * The bundles a service's build emits.
   * @param {string} service App name.
   * @returns {string[]} File names, such as `main.mjs`, `main.mjs` first.
   */
  entries(service) {
    const project = JSON.parse(
      readFileSync(
        join(this.root, 'backend/apps', service, 'project.json'),
        'utf8',
      ),
    );
    const command = project.targets?.build?.options?.command ?? '';
    const extra = [...command.matchAll(ServiceArtifacts.ENTRY)].map(
      (match) => match[1],
    );
    return ['main', ...extra].map((entry) => `${entry}.mjs`);
  }
}

/**
 * The environment a service image runs with in the smoke: the shared settings of
 * `backend/infra/local/artifact-smoke.env`, the service's databases and Valkey prefix, and secrets generated for
 * this run, so no credential is stored in the repository.
 */
export class SmokeEnvironment {
  static SETTINGS = 'backend/infra/local/artifact-smoke.env';
  static INSTANCE = 'main';
  static DATABASE_USER = 'platform';
  static SECRET_LENGTH = 32;
  static SECRETS = [
    'INTERNAL_API_SHARED_SECRET',
    'IDENTITY_EMAIL_PEPPER',
    'IDENTITY_TOKEN_PEPPER',
    'IDENTITY_API_KEY_PEPPER',
    'IDENTITY_DEVICE_ID_KEY',
    'IDENTITY_DATA_KEY',
    'NOTIFICATIONS_EMAIL_PEPPER',
  ];

  /**
   * @param {string} root Repository root.
   * @param {string} databaseHost Host name of the PostgreSQL container on the smoke network.
   * @param {string} valkeyHost Host name of the Valkey container on the smoke network.
   */
  constructor(root, databaseHost, valkeyHost) {
    this.settings = readFileSync(join(root, SmokeEnvironment.SETTINGS), 'utf8');
    this.databaseHost = databaseHost;
    this.valkeyHost = valkeyHost;
    this.databasePassword = SmokeEnvironment.secret();
    this.secrets = Object.fromEntries(
      SmokeEnvironment.SECRETS.map((name) => [name, SmokeEnvironment.secret()]),
    );
    this.signingKeys = SmokeEnvironment.signingKeys();
  }

  /**
   * The databases of a service: its catalog and two shards.
   * @param {string} service App name.
   * @returns {{ catalog: string, shards: string[] }} Database names.
   */
  static databases(service) {
    return {
      catalog: `${service}_catalog`,
      shards: [`${service}_shard_0`, `${service}_shard_1`],
    };
  }

  /**
   * The variables of a service, in `--env-file` format.
   * @param {string} service App name.
   * @returns {string} One `NAME=value` per line.
   */
  forService(service) {
    const variables = {
      SERVICE_NAME: service,
      DB_USER: SmokeEnvironment.DATABASE_USER,
      DB_PASSWORD: this.databasePassword,
      DB_CATALOG_NAME: SmokeEnvironment.databases(service).catalog,
      DB_CATALOG_INSTANCE: SmokeEnvironment.INSTANCE,
      DB_INSTANCES: JSON.stringify({
        [SmokeEnvironment.INSTANCE]: {
          primary: { host: this.databaseHost, port: 5432 },
        },
      }),
      VALKEY_URL: `redis://${this.valkeyHost}:6379`,
      VALKEY_KEY_PREFIX: service,
      IDENTITY_SIGNING_KEYS: this.signingKeys,
      ...this.secrets,
    };
    const generated = Object.entries(variables).map(
      ([name, value]) => `${name}=${value}`,
    );
    return `${this.settings.trimEnd()}\n${generated.join('\n')}\n`;
  }

  /**
   * A random secret for this run.
   * @returns {string} Base64url text of `SECRET_LENGTH` random bytes.
   */
  static secret() {
    return randomBytes(SmokeEnvironment.SECRET_LENGTH).toString('base64url');
  }

  /**
   * One active ES256 signing key for identity, generated for this run.
   * @returns {string} JSON array with one private JWK.
   */
  static signingKeys() {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    return JSON.stringify([
      { ...privateKey.export({ format: 'jwk' }), kid: 'artifact-smoke' },
    ]);
  }
}

/**
 * Builds the ARM64 image and the Lambda package of every backend service and proves they start: inside each image
 * `node migrate.mjs all` exits 0, `node main.mjs` answers `HealthRoute.Ready` against the PostgreSQL and Valkey of
 * `backend/docker-compose.yml`, and the Lambda package holds every entry point and loads its handler in the Lambda
 * Node.js runtime image. It starts its
 * own network and containers, named after `prefix`, and removes them, and the images it built, when it ends.
 */
export class ArtifactSmoke {
  static DOCKERFILE = 'backend/infra/scripts/service.Dockerfile';
  static COMPOSE = 'backend/docker-compose.yml';
  static READY_PATH = '/health/ready';
  static PORT = 3000;
  static LAMBDA_TARGET = 'lambda';
  static PLATFORM = 'linux/arm64';
  static LAMBDA_RUNTIME =
    'public.ecr.aws/lambda/nodejs:24@sha256:5f161369102f24d3b088ca52e8e83eeee55e701080ee91af858b4cb2f762b6ef';
  static PROBE_ATTEMPTS = 60;
  static PROBE_DELAY_MS = 2_000;

  /**
   * @param {{ root: string, prefix: string, services: string[], artifacts: ServiceArtifacts,
   *   runner: CommandRunner, sleeper: Sleeper, log: (line: string) => void,
   *   environment?: SmokeEnvironment, workDir?: string }} options What to smoke and how.
   */
  constructor(options) {
    this.root = options.root;
    this.prefix = options.prefix;
    this.services = options.services;
    this.artifacts = options.artifacts;
    this.runner = options.runner;
    this.sleeper = options.sleeper;
    this.log = options.log;
    this.network = `${this.prefix}-net`;
    this.postgres = `${this.prefix}-postgres`;
    this.valkey = `${this.prefix}-valkey`;
    this.environment =
      options.environment ??
      new SmokeEnvironment(this.root, this.postgres, this.valkey);
    this.workDir =
      options.workDir ?? mkdtempSync(join(tmpdir(), 'artifact-smoke-'));
    this.containers = [];
    this.images = [];
  }

  /**
   * Runs the smoke over every service and cleans up whatever it started, even on failure.
   * @returns {number} 0 when every service passed, 1 otherwise.
   */
  run() {
    try {
      this.startDependencies();
      for (const service of this.services) this.smoke(service);
      this.log('Every service image started and every Lambda package loaded.');
      return 0;
    } catch (error) {
      this.log(`Artifact smoke failed: ${error.message}`);
      return 1;
    } finally {
      this.cleanUp();
    }
  }

  /** Starts PostgreSQL and Valkey from the images of the compose file, on a network of their own. */
  startDependencies() {
    const images = this.composeImages();
    this.docker(['network', 'create', this.network]);
    this.startContainer(this.postgres, [
      '-e',
      `POSTGRES_USER=${SmokeEnvironment.DATABASE_USER}`,
      '-e',
      `POSTGRES_PASSWORD=${this.environment.databasePassword}`,
      images.postgres,
    ]);
    this.startContainer(this.valkey, [images.valkey]);
    this.until(`PostgreSQL ${this.postgres}`, () =>
      this.probe([
        'exec',
        this.postgres,
        'pg_isready',
        '-h',
        '127.0.0.1',
        '-U',
        SmokeEnvironment.DATABASE_USER,
      ]),
    );
    this.until(`Valkey ${this.valkey}`, () =>
      this.probe(['exec', this.valkey, 'valkey-cli', 'ping']),
    );
  }

  /**
   * Builds, migrates and starts one service, and checks its Lambda package.
   * @param {string} service App name.
   */
  smoke(service) {
    this.log(`== ${service}`);
    const image = `${this.prefix}/${service}:smoke`;
    this.docker(this.buildArgs(service, ['-t', image]));
    this.images.push(image);
    const envFile = join(this.workDir, `${service}.env`);
    writeFileSync(envFile, this.environment.forService(service), {
      mode: 0o600,
    });
    this.createDatabases(service);
    this.migrate(service, image, envFile);
    this.registerShards(service);
    this.migrate(service, image, envFile);
    this.checkReady(service, image, envFile);
    this.checkLambdaPackage(service, envFile);
  }

  /**
   * The arguments of `docker build` for a service, for the platform the deploy publishes.
   * @param {string} service App name.
   * @param {string[]} extra Tag or target and output.
   * @returns {string[]} Arguments.
   */
  buildArgs(service, extra) {
    return [
      'build',
      '-f',
      ArtifactSmoke.DOCKERFILE,
      '--platform',
      ArtifactSmoke.PLATFORM,
      '--build-arg',
      `SERVICE=${service}`,
      ...extra,
      '.',
    ];
  }

  /**
   * Creates the catalog and shard databases of a service, each with the extensions provisioning creates.
   * @param {string} service App name.
   */
  createDatabases(service) {
    const { catalog, shards } = SmokeEnvironment.databases(service);
    for (const database of [catalog, ...shards]) {
      this.psql('postgres', `CREATE DATABASE "${database}"`);
      this.psql(database, 'CREATE EXTENSION IF NOT EXISTS vector');
    }
  }

  /**
   * Records the service's shards in its catalog directory, which the first migration created.
   * @param {string} service App name.
   */
  registerShards(service) {
    const { catalog, shards } = SmokeEnvironment.databases(service);
    const rows = shards
      .map((shard) => `('${shard}', '${SmokeEnvironment.INSTANCE}', now())`)
      .join(', ');
    this.psql(
      catalog,
      `INSERT INTO shard_instances (logical_shard, instance, updated_at) VALUES ${rows} ON CONFLICT DO NOTHING`,
    );
  }

  /**
   * Runs `node migrate.mjs all` inside the image and requires exit code 0.
   * @param {string} service App name.
   * @param {string} image Image reference.
   * @param {string} envFile Environment file of the service.
   */
  migrate(service, image, envFile) {
    const result = this.runner.run('docker', [
      'run',
      '--rm',
      '--network',
      this.network,
      '--env-file',
      envFile,
      image,
      'node',
      'migrate.mjs',
      'all',
    ]);
    if (result.status !== 0) {
      throw new Error(
        `${service}: node migrate.mjs all exited ${result.status}\n${result.stderr}`,
      );
    }
    this.log(`${service}: migrate.mjs all exited 0`);
  }

  /**
   * Starts the image with its default command and waits until `HealthRoute.Ready` answers 200.
   * @param {string} service App name.
   * @param {string} image Image reference.
   * @param {string} envFile Environment file of the service.
   */
  checkReady(service, image, envFile) {
    const container = `${this.prefix}-${service}`;
    this.startContainer(container, ['--env-file', envFile, image]);
    const url = `http://127.0.0.1:${ArtifactSmoke.PORT}${ArtifactSmoke.READY_PATH}`;
    try {
      this.until(`${service} ${ArtifactSmoke.READY_PATH}`, () =>
        this.probe([
          'exec',
          container,
          'node',
          '-e',
          `fetch('${url}').then((r) => process.exit(r.status === 200 ? 0 : 1), () => process.exit(1))`,
        ]),
      );
    } catch (error) {
      const logs = this.runner.run('docker', [
        'logs',
        '--tail',
        '50',
        container,
      ]);
      throw new Error(`${error.message}\n${logs.stdout}${logs.stderr}`);
    }
    this.log(`${service}: main.mjs answered ${ArtifactSmoke.READY_PATH}`);
    this.remove(container);
  }

  /**
   * Exports the Lambda package of a service, checks that it holds every entry point and `node_modules`, and loads
   * its handler in the Lambda Node.js runtime image, so a native addon built for the musl Node of the service image
   * fails here as it would in Lambda. The exported package is removed once checked.
   * @param {string} service App name.
   * @param {string} envFile Environment file of the service.
   */
  checkLambdaPackage(service, envFile) {
    const dir = join(this.workDir, `${service}-lambda`);
    mkdirSync(dir, { recursive: true });
    try {
      this.docker(
        this.buildArgs(service, [
          '--target',
          ArtifactSmoke.LAMBDA_TARGET,
          '--output',
          `type=local,dest=${dir}`,
        ]),
      );
      const missing = [
        ...this.artifacts.entries(service),
        'node_modules',
      ].filter((entry) => !existsSync(join(dir, entry)));
      if (missing.length > 0) {
        throw new Error(
          `${service}: the Lambda package lacks ${missing.join(', ')}`,
        );
      }
      const result = this.runner.run('docker', [
        'run',
        '--rm',
        '--env-file',
        envFile,
        '--platform',
        ArtifactSmoke.PLATFORM,
        '-v',
        `${dir}:/var/task:ro`,
        '-w',
        '/var/task',
        '--entrypoint',
        'node',
        ArtifactSmoke.LAMBDA_RUNTIME,
        '-e',
        "import('./lambda.mjs').then((m) => process.exit(typeof m.handler === 'function' ? 0 : 1))",
      ]);
      if (result.status !== 0) {
        throw new Error(
          `${service}: the Lambda handler did not load\n${result.stderr}`,
        );
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    this.log(`${service}: the Lambda package loads lambda.handler`);
  }

  /**
   * The PostgreSQL and Valkey images the compose file pins.
   * @returns {{ postgres: string, valkey: string }} Image references.
   */
  composeImages() {
    const compose = readFileSync(
      join(this.root, ArtifactSmoke.COMPOSE),
      'utf8',
    );
    const imageOf = (name) => {
      const image = new RegExp(
        `\\n {2}${name}:\\n(?: {4}#.*\\n)* {4}image: (\\S+)`,
      ).exec(compose)?.[1];
      if (image === undefined) {
        throw new Error(`${ArtifactSmoke.COMPOSE} has no ${name} image`);
      }
      return image;
    };
    return { postgres: imageOf('postgres'), valkey: imageOf('valkey') };
  }

  /**
   * Starts a detached container on the smoke network and remembers it for the clean-up.
   * @param {string} name Container name.
   * @param {string[]} args Options, image and command.
   */
  startContainer(name, args) {
    this.docker([
      'run',
      '-d',
      '--name',
      name,
      '--network',
      this.network,
      ...args,
    ]);
    this.containers.push(name);
  }

  /**
   * Runs SQL as the superuser in one database of the smoke PostgreSQL.
   * @param {string} database Database name.
   * @param {string} sql Statement.
   */
  psql(database, sql) {
    this.docker([
      'exec',
      this.postgres,
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      SmokeEnvironment.DATABASE_USER,
      '-d',
      database,
      '-qc',
      sql,
    ]);
  }

  /**
   * Repeats a probe until it passes.
   * @param {string} what What is awaited, for the error.
   * @param {() => boolean} probe Returns true once ready.
   * @throws Error when it never passes.
   */
  until(what, probe) {
    for (
      let attempt = 0;
      attempt < ArtifactSmoke.PROBE_ATTEMPTS;
      attempt += 1
    ) {
      if (probe()) return;
      this.sleeper.sleep(ArtifactSmoke.PROBE_DELAY_MS);
    }
    throw new Error(
      `${what} was not ready after ${ArtifactSmoke.PROBE_ATTEMPTS} attempts`,
    );
  }

  /**
   * Runs a docker command and reports whether it exited 0.
   * @param {string[]} args Docker arguments.
   * @returns {boolean} Whether it passed.
   */
  probe(args) {
    return this.runner.run('docker', args).status === 0;
  }

  /**
   * Runs a docker command from the repository root and throws when it fails.
   * @param {string[]} args Docker arguments.
   * @returns {string} Its output.
   */
  docker(args) {
    const result = this.runner.run('docker', args, { cwd: this.root });
    if (result.status !== 0) {
      throw new Error(
        `docker ${args.slice(0, 2).join(' ')} failed\n${result.stderr}`,
      );
    }
    return result.stdout;
  }

  /**
   * Removes one container it started.
   * @param {string} name Container name.
   */
  remove(name) {
    this.runner.run('docker', ['rm', '-f', name]);
    this.containers = this.containers.filter((container) => container !== name);
  }

  /** Removes, by name, the containers, the network and the images it created, and its work folder. */
  cleanUp() {
    for (const container of [...this.containers].reverse())
      this.remove(container);
    this.runner.run('docker', ['network', 'rm', this.network]);
    for (const image of this.images) this.runner.run('docker', ['rmi', image]);
    rmSync(this.workDir, { recursive: true, force: true });
  }
}
