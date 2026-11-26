import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, it } from 'node:test';
import {
  ArtifactSmoke,
  ServiceArtifacts,
  SmokeEnvironment,
} from '../artifact-smoke.mjs';
import { ScriptRunner } from './utils/script-runner.mjs';

const ROOT = resolve(ScriptRunner.scriptsDir, '../../..');

/** Records docker calls and answers them from a script of exit codes; `--output` writes the package entries. */
class FakeDocker {
  constructor(entries, failures = {}) {
    this.entries = entries;
    this.failures = failures;
    this.calls = [];
  }

  run(command, args) {
    this.calls.push(args.join(' '));
    const output = args.find((arg) => arg.startsWith('type=local,dest='));
    if (output !== undefined) {
      const dir = output.slice('type=local,dest='.length);
      for (const entry of this.entries) writeFileSync(join(dir, entry), '');
      mkdirSync(join(dir, 'node_modules'));
    }
    const failing = Object.entries(this.failures).find(([pattern]) =>
      args.join(' ').includes(pattern),
    );
    return {
      status: failing === undefined ? 0 : failing[1],
      stdout: '',
      stderr: '',
    };
  }
}

/** Never waits. */
class InstantSleeper {
  sleep() {}
}

/** A service list and its entries, without reading the repository. */
class FixedArtifacts {
  entries() {
    return ['main.mjs', 'worker.mjs', 'migrate.mjs', 'lambda.mjs'];
  }
}

const smokeWith = (docker, workDir) =>
  new ArtifactSmoke({
    root: ROOT,
    prefix: 'unit',
    services: ['tasks'],
    artifacts: new FixedArtifacts(),
    runner: docker,
    sleeper: new InstantSleeper(),
    log: () => {},
    workDir,
  });

describe('ArtifactSmoke', () => {
  const dirs = [];
  const workDir = () => {
    const dir = mkdtempSync(join(tmpdir(), 'artifact-smoke-test-'));
    dirs.push(dir);
    return dir;
  };
  after(() =>
    dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })),
  );

  it('migrates twice around the shard registration, waits for readiness, loads the handler and cleans up', () => {
    const docker = new FakeDocker(new FixedArtifacts().entries());

    assert.equal(smokeWith(docker, workDir()).run(), 0);

    const index = (pattern) =>
      docker.calls.findIndex((call) => call.includes(pattern));
    const migrations = docker.calls.filter((call) =>
      call.includes('migrate.mjs all'),
    );
    assert.equal(migrations.length, 2);
    assert.ok(index('INSERT INTO shard_instances') > index('migrate.mjs all'));
    assert.ok(index('/health/ready') > docker.calls.lastIndexOf(migrations[1]));
    assert.ok(index("import('./lambda.mjs')") > index('--target lambda'));
    assert.deepEqual(docker.calls.slice(-4), [
      'rm -f unit-valkey',
      'rm -f unit-postgres',
      'network rm unit-net',
      'rmi unit/tasks:smoke',
    ]);
  });

  it('fails when migrate exits non-zero and still removes what it started', () => {
    const docker = new FakeDocker(new FixedArtifacts().entries(), {
      'migrate.mjs all': 1,
    });

    assert.equal(smokeWith(docker, workDir()).run(), 1);
    assert.ok(!docker.calls.some((call) => call.includes('/health/ready')));
    assert.ok(docker.calls.includes('rm -f unit-postgres'));
    assert.equal(docker.calls.at(-1), 'rmi unit/tasks:smoke');
  });

  it('fails when the service never answers ready', () => {
    const docker = new FakeDocker(new FixedArtifacts().entries(), {
      '/health/ready': 1,
    });

    assert.equal(smokeWith(docker, workDir()).run(), 1);
    assert.equal(
      docker.calls.filter((call) => call.includes('/health/ready')).length,
      ArtifactSmoke.PROBE_ATTEMPTS,
    );
    assert.ok(docker.calls.includes('logs --tail 50 unit-tasks'));
  });

  it('fails when the Lambda package lacks an entry point', () => {
    const docker = new FakeDocker(['main.mjs', 'lambda.mjs']);

    assert.equal(smokeWith(docker, workDir()).run(), 1);
    assert.ok(
      !docker.calls.some((call) => call.includes("import('./lambda.mjs')")),
    );
  });

  it('runs the PostgreSQL and Valkey images that the compose file pins', () => {
    const images = smokeWith(new FakeDocker([]), workDir()).composeImages();
    assert.match(
      images.postgres,
      /^pgvector\/pgvector:.+@sha256:[0-9a-f]{64}$/,
    );
    assert.match(
      images.valkey,
      /^valkey\/valkey-bundle:.+@sha256:[0-9a-f]{64}$/,
    );
  });
});

describe('ServiceArtifacts', () => {
  const artifacts = new ServiceArtifacts(ROOT);

  it('finds the five deployable services', () => {
    assert.deepEqual(artifacts.services(), [
      'billing',
      'identity',
      'notifications',
      'reports',
      'tasks',
    ]);
  });

  it('has every service bundle main, worker, lambda and migrate, and identity seed and tenant-move too', () => {
    for (const service of artifacts.services()) {
      const entries = artifacts.entries(service);
      for (const entry of ServiceArtifacts.REQUIRED_ENTRIES) {
        assert.ok(
          entries.includes(`${entry}.mjs`),
          `${service} lacks ${entry}.mjs`,
        );
      }
    }
    for (const entry of ['seed.mjs', 'tenant-move.mjs']) {
      assert.ok(artifacts.entries('identity').includes(entry));
    }
  });
});

describe('SmokeEnvironment', () => {
  const settings = readFileSync(join(ROOT, SmokeEnvironment.SETTINGS), 'utf8');

  it('keeps every secret out of the committed settings', () => {
    const names = settings.split('\n').map((line) => line.split('=')[0]);
    for (const secret of [
      ...SmokeEnvironment.SECRETS,
      'DB_PASSWORD',
      'IDENTITY_SIGNING_KEYS',
    ]) {
      assert.ok(
        !names.includes(secret),
        `${secret} must be generated, not stored`,
      );
    }
  });

  it('points each service at its own databases and prefix with secrets generated per run', () => {
    const first = new SmokeEnvironment(ROOT, 'db', 'cache');
    const second = new SmokeEnvironment(ROOT, 'db', 'cache');
    const variables = (text) =>
      Object.fromEntries(
        text
          .trim()
          .split('\n')
          .map((line) => [
            line.slice(0, line.indexOf('=')),
            line.slice(line.indexOf('=') + 1),
          ]),
      );
    const tasks = variables(first.forService('tasks'));

    assert.equal(tasks.SERVICE_NAME, 'tasks');
    assert.equal(tasks.DB_CATALOG_NAME, 'tasks_catalog');
    assert.equal(tasks.VALKEY_KEY_PREFIX, 'tasks');
    assert.equal(tasks.VALKEY_URL, 'redis://cache:6379');
    assert.deepEqual(JSON.parse(tasks.DB_INSTANCES), {
      main: { primary: { host: 'db', port: 5432 } },
    });
    assert.equal(JSON.parse(tasks.IDENTITY_SIGNING_KEYS)[0].crv, 'P-256');
    assert.notEqual(
      tasks.INTERNAL_API_SHARED_SECRET,
      variables(second.forService('tasks')).INTERNAL_API_SHARED_SECRET,
    );
  });
});

describe('service.Dockerfile', () => {
  const dockerfile = readFileSync(join(ROOT, ArtifactSmoke.DOCKERFILE), 'utf8');
  const nvmrc = readFileSync(join(ROOT, '.nvmrc'), 'utf8').trim();

  it('pins the Node base image of .nvmrc by digest', () => {
    const base = /^FROM (\S+) AS base$/m.exec(dockerfile)?.[1] ?? '';
    assert.match(
      base,
      new RegExp(
        `^node:${nvmrc.replaceAll('.', '\\.')}-alpine[\\d.]*@sha256:[0-9a-f]{64}$`,
      ),
    );
  });

  it('installs production node_modules with pnpm deploy and runs main.mjs as a non-root user', () => {
    assert.match(
      dockerfile,
      /pnpm --filter @node-template\/backend deploy --legacy --prod --frozen-lockfile/,
    );
    const runtime = dockerfile.slice(dockerfile.lastIndexOf('\nFROM '));
    assert.match(runtime, /^USER node$/m);
    assert.match(runtime, /^CMD \["node", "main\.mjs"\]$/m);
  });

  it('has a lambda stage with the bundles and node_modules', () => {
    const lambda =
      /^FROM scratch AS lambda$([\s\S]*?)^FROM /m.exec(dockerfile)?.[1] ?? '';
    assert.match(
      lambda,
      /COPY --from=dependencies \/deploy\/node_modules \/node_modules/,
    );
    assert.match(lambda, /COPY backend\/dist\/\$\{SERVICE\}\/ \//);
  });
});

describe('.dockerignore', () => {
  it('excludes everything except the manifests pnpm deploy reads and the bundles', () => {
    const lines = readFileSync(join(ROOT, '.dockerignore'), 'utf8')
      .split('\n')
      .filter((line) => line !== '' && !line.startsWith('#'));
    assert.equal(lines[0], '*');
    assert.deepEqual(lines.filter((line) => line.startsWith('!')).sort(), [
      '!backend/dist/',
      '!backend/package.json',
      '!package.json',
      '!pnpm-lock.yaml',
      '!pnpm-workspace.yaml',
    ]);
  });
});
