import assert from 'node:assert/strict';
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, it } from 'node:test';
import { LocalSmoke, LocalSmokeSettings } from '../local-smoke.mjs';
import { TfvarsBlockReader } from '../tfvars-block-reader.mjs';
import { ScriptRunner } from './utils/script-runner.mjs';

const ROOT = resolve(ScriptRunner.scriptsDir, '../../..');

/** Records every command and answers from a list of failing patterns; LocalStack reports its topology ready. */
class FakeCommands {
  constructor(failures = []) {
    this.failures = failures;
    this.calls = [];
  }

  run(command, args, options = {}) {
    const line = [command, ...args].join(' ');
    this.calls.push({ line, options });
    const failing = this.failures.some((pattern) => line.includes(pattern));
    return {
      status: failing ? 1 : 0,
      stdout: line.includes('_localstack/init/ready')
        ? '{"completed": true}'
        : '',
      stderr: failing ? 'boom' : '',
    };
  }

  lines() {
    return this.calls.map((call) => call.line);
  }

  index(fragment) {
    return this.lines().findIndex((line) => line.includes(fragment));
  }
}

/** Never waits. */
class InstantSleeper {
  sleep() {}
}

const settings = new LocalSmokeSettings(ROOT);
const smokeWith = (commands) =>
  new LocalSmoke({
    root: ROOT,
    project: 'unit-smoke',
    services: ['identity', 'tasks'],
    settings,
    runner: commands,
    sleeper: new InstantSleeper(),
    log: () => {},
    env: { PATH: process.env.PATH },
  });

describe('LocalSmoke', () => {
  it('builds, migrates, starts, and seeds and tests twice, then removes its project and images', () => {
    const commands = new FakeCommands();

    assert.equal(smokeWith(commands).run(), 0);

    const lines = commands.lines();
    const steps = [
      'build -f backend/infra/scripts/service.Dockerfile --platform linux/arm64 --build-arg SERVICE=identity -t unit-smoke/identity:smoke .',
      'up -d postgres valkey localstack',
      'run --rm --no-deps identity node migrate.mjs all',
      "INSERT INTO shard_instances (logical_shard, instance, updated_at) VALUES ('identity_shard_0', 'main', now()), ('identity_shard_1', 'main', now())",
      'up -d identity identity-worker tasks tasks-worker gateway',
      'exec -T tasks node -e',
      '--profile seed run --rm --no-deps identity-seed',
      'jest --config backend/e2e/deploy-smoke/jest.smoke.config.cjs --runInBand',
      '--profile seed down -v --remove-orphans',
      'rmi unit-smoke/tasks:smoke',
    ];
    const positions = steps.map((step) => commands.index(step));
    assert.ok(
      positions.every((position) => position >= 0),
      String(positions),
    );
    assert.deepEqual(
      [...positions].sort((a, b) => a - b),
      positions,
    );
    assert.equal(
      lines.filter((line) => line.includes('identity-seed')).length,
      2,
    );
    assert.equal(
      lines.filter((line) => line.includes('jest --config')).length,
      2,
    );
    assert.equal(
      lines.filter((line) => line.includes('identity node migrate.mjs all'))
        .length,
      2,
    );
  });

  it('runs compose for its own project with the absolute file and smoke.env', () => {
    const commands = new FakeCommands();

    smokeWith(commands).run();

    const compose = commands.lines().find((line) => line.includes(' compose '));
    assert.ok(
      compose.startsWith(
        `docker compose -p unit-smoke -f ${join(ROOT, LocalSmoke.COMPOSE)} --env-file ${join(ROOT, LocalSmokeSettings.FILE)} `,
      ),
    );
  });

  it('gives compose secrets generated for this run and the suite the gateway URL and the smoke account', () => {
    const commands = new FakeCommands();

    smokeWith(commands).run();

    const up = commands.calls.find((call) =>
      call.line.includes('up -d postgres'),
    );
    const suite = commands.calls.find((call) =>
      call.line.includes('jest --config'),
    );
    assert.equal(up.options.env.SMOKE_IMAGE_PREFIX, 'unit-smoke');
    for (const name of [
      'SMOKE_DB_PASSWORD',
      ...Object.keys(LocalSmoke.SECRETS),
    ]) {
      assert.ok(up.options.env[name].length >= 40, name);
    }
    assert.ok(JSON.parse(up.options.env.SMOKE_IDENTITY_SIGNING_KEYS)[0].d);
    assert.equal(suite.options.inherit, true);
    assert.equal(suite.options.env.SMOKE_BASE_URL, settings.baseUrl());
    assert.equal(
      suite.options.env.SMOKE_ACCOUNT,
      settings.values.SMOKE_ACCOUNT,
    );
  });

  it('fails when the suite fails and still removes its project and images', () => {
    const commands = new FakeCommands(['jest --config']);

    assert.equal(smokeWith(commands).run(), 1);

    assert.ok(commands.index('down -v --remove-orphans') >= 0);
    assert.ok(commands.index('rmi unit-smoke/identity:smoke') >= 0);
    assert.equal(
      commands.lines().filter((line) => line.includes('identity-seed')).length,
      1,
    );
  });

  it('reports the logs of a service that never gets ready', () => {
    const commands = new FakeCommands(['exec -T tasks node']);
    const lines = [];
    const smoke = new LocalSmoke({
      root: ROOT,
      project: 'unit-smoke',
      services: ['tasks'],
      settings,
      runner: commands,
      sleeper: new InstantSleeper(),
      log: (line) => lines.push(line),
      env: {},
    });

    assert.equal(smoke.run(), 1);

    assert.ok(commands.index('logs --tail 60 tasks') >= 0);
    assert.match(
      lines.at(-1),
      /tasks \/health\/ready was not ready after 90 attempts/,
    );
    assert.equal(commands.index('identity-seed'), -1);
  });
});

describe('LocalSmokeSettings', () => {
  const dirs = [];
  after(() =>
    dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })),
  );
  const rootWith = (text) => {
    const dir = mkdtempSync(join(tmpdir(), 'local-smoke-settings-'));
    dirs.push(dir);
    mkdirSync(join(dir, 'backend/infra/local'), { recursive: true });
    writeFileSync(join(dir, LocalSmokeSettings.FILE), text);
    return dir;
  };

  it('reads the account and the port, skipping comments, and keeps the rest of the line as the value', () => {
    const read = new LocalSmokeSettings(
      rootWith(
        '# local\n\nSMOKE_ACCOUNT={"a":"b=c"}\nSMOKE_GATEWAY_PORT=1234\n',
      ),
    );

    assert.equal(read.values.SMOKE_ACCOUNT, '{"a":"b=c"}');
    assert.equal(read.baseUrl(), 'http://127.0.0.1:1234');
  });

  it('refuses a file without the smoke account', () => {
    assert.throws(
      () => new LocalSmokeSettings(rootWith('SMOKE_GATEWAY_PORT=1234\n')),
      /has no SMOKE_ACCOUNT/,
    );
  });

  it('reads the committed smoke.env', () => {
    assert.match(
      settings.values.SMOKE_ACCOUNT,
      /success@simulator\.amazonses\.com/,
    );
  });
});

/** The regex locations of the smoke gateway, in the order nginx tries them, with the service each one proxies to. */
class GatewayRoutes {
  constructor(text) {
    this.routes = [
      ...text.matchAll(
        /location ~ (\S+) \{\s*proxy_pass http:\/\/([a-z-]+):\d+;/g,
      ),
    ].map(([, pattern, service]) => ({
      pattern: new RegExp(pattern),
      service,
    }));
  }

  serviceOf(path) {
    return this.routes.find((route) => route.pattern.test(path))?.service;
  }
}

describe('smoke gateway', () => {
  const environments = ['dev', 'staging', 'prod'];
  const gateway = new GatewayRoutes(
    readFileSync(join(ROOT, 'backend/infra/local/smoke-gateway.conf'), 'utf8'),
  );
  const servicesOf = (environment) =>
    join(ROOT, 'backend/infra/terraform/environments', environment, 'services');
  const prefixesOf = (environment, service) => {
    const api = new TfvarsBlockReader(
      readFileSync(
        join(servicesOf(environment), service, 'terraform.tfvars'),
        'utf8',
      ),
    ).block('api');
    const list = /route_prefixes\s*=\s*\[([^\]]*)\]/.exec(api ?? '')?.[1];
    return [...(list ?? '').matchAll(/"([^"]+)"/g)].map(([, prefix]) => prefix);
  };

  for (const environment of environments) {
    for (const service of readdirSync(servicesOf(environment))) {
      it(`routes every route prefix of ${service} in the ${environment} tfvars to ${service}`, () => {
        const prefixes = prefixesOf(environment, service);
        assert.ok(
          prefixes.length > 0,
          `${service} declares no route_prefixes in ${environment}`,
        );
        for (const prefix of prefixes) {
          assert.equal(gateway.serviceOf(prefix), service, prefix);
          assert.equal(gateway.serviceOf(`${prefix}/probe`), service, prefix);
        }
      });
    }
  }
});
