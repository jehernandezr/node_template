const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const { GenericContainer, Wait } = require('testcontainers');

/**
 * The PostgreSQL and the Valkey that every integration suite of one Jest run shares. The Jest
 * `globalSetup` starts them once and publishes where they listen through environment variables, which
 * the workers inherit; each suite then creates its own databases and its own Valkey user.
 */
class JestTestServers {
  static POSTGRES_IMAGE = 'pgvector/pgvector:0.8.7-pg17';
  static VALKEY_IMAGE = 'valkey/valkey-bundle:8.1';
  static POSTGRES_DATA = '/var/lib/postgresql/data';
  static POSTGRES_SETTINGS = [
    'fsync=off',
    'synchronous_commit=off',
    'full_page_writes=off',
    'wal_level=logical',
    'max_connections=400',
    'max_replication_slots=20',
    'max_wal_senders=20',
  ];
  static VARIABLES = Object.freeze({
    PostgresHost: 'NT_TEST_POSTGRES_HOST',
    PostgresPort: 'NT_TEST_POSTGRES_PORT',
    PostgresUser: 'NT_TEST_POSTGRES_USER',
    PostgresPassword: 'NT_TEST_POSTGRES_PASSWORD',
    ValkeyHost: 'NT_TEST_VALKEY_HOST',
    ValkeyPort: 'NT_TEST_VALKEY_PORT',
    RolePassword: 'NT_TEST_ROLE_PASSWORD',
  });
  static GLOBAL_KEY = Symbol.for('node-template.jest-test-servers');

  /**
   * @param {NodeJS.ProcessEnv} env Environment the variables are written to; the workers inherit it.
   */
  constructor(env) {
    this.env = env;
    this.started = [];
  }

  /**
   * Starts both servers and publishes them, unless there is no container runtime or a parent run already did.
   * @returns {Promise<void>} Resolves once both servers accept connections.
   */
  async start() {
    if (this.env[JestTestServers.VARIABLES.PostgresHost] !== undefined) return;
    if (!this.#runtimeAvailable()) return;
    const [postgres, valkey] = await Promise.all([
      this.#startPostgres(),
      this.#startValkey(),
    ]);
    this.started.push(postgres, valkey);
    const names = JestTestServers.VARIABLES;
    this.env[names.PostgresHost] = postgres.getHost();
    this.env[names.PostgresPort] = String(postgres.getPort());
    this.env[names.PostgresUser] = postgres.getUsername();
    this.env[names.PostgresPassword] = postgres.getPassword();
    this.env[names.ValkeyHost] = valkey.getHost();
    this.env[names.ValkeyPort] = String(valkey.getMappedPort(6379));
    this.env[names.RolePassword] = randomBytes(18).toString('base64url');
  }

  /**
   * Stops the servers this instance started; servers published by a parent run are left alone.
   * @returns {Promise<void>} Resolves once both containers are gone.
   */
  async stop() {
    await Promise.all(this.started.splice(0).map((server) => server.stop()));
  }

  #runtimeAvailable() {
    return (
      spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], {
        timeout: 10_000,
        stdio: 'ignore',
      }).status === 0
    );
  }

  #autoCleanup() {
    return this.env['TESTCONTAINERS_RYUK_DISABLED'] !== 'true';
  }

  #startPostgres() {
    return new PostgreSqlContainer(JestTestServers.POSTGRES_IMAGE)
      .withCommand([
        'postgres',
        ...JestTestServers.POSTGRES_SETTINGS.flatMap((setting) => [
          '-c',
          setting,
        ]),
      ])
      .withTmpFs({ [JestTestServers.POSTGRES_DATA]: 'rw' })
      .withAutoCleanup(this.#autoCleanup())
      .start();
  }

  #startValkey() {
    return new GenericContainer(JestTestServers.VALKEY_IMAGE)
      .withCommand(['valkey-server', '--save', '', '--appendonly', 'no'])
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
      .withAutoCleanup(this.#autoCleanup())
      .start();
  }
}

module.exports = { JestTestServers };
