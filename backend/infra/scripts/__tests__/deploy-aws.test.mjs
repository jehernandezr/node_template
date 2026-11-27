import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, it } from 'node:test';
import { ScriptRunner } from './utils/script-runner.mjs';

const TERRAFORM_ROOT = resolve(ScriptRunner.scriptsDir, '../terraform');

/** Runs deploy-aws.sh with a terraform on PATH that only records its arguments. */
class RecordingDeploy {
  #dir = mkdtempSync(join(tmpdir(), 'deploy-aws-'));

  constructor() {
    const terraform = join(this.#dir, 'terraform');
    writeFileSync(
      terraform,
      `#!/usr/bin/env bash\necho "$*" >> "${join(this.#dir, 'calls.log')}"\n`,
    );
    chmodSync(terraform, 0o755);
  }

  run(environment, args) {
    rmSync(join(this.#dir, 'calls.log'), { force: true });
    const result = spawnSync(
      'bash',
      [join(ScriptRunner.scriptsDir, 'deploy-aws.sh'), ...args],
      {
        encoding: 'utf8',
        env: {
          PATH: `${this.#dir}:${process.env.PATH}`,
          ENV: environment,
          PLAN_DIR: join(this.#dir, 'plans'),
        },
      },
    );
    const log = join(this.#dir, 'calls.log');
    const calls = existsSync(log)
      ? readFileSync(log, 'utf8').trim().split('\n')
      : [];
    return { status: result.status, stderr: result.stderr, calls };
  }

  remove() {
    rmSync(this.#dir, { recursive: true, force: true });
  }
}

describe('deploy-aws.sh', () => {
  const deploy = new RecordingDeploy();
  after(() => deploy.remove());

  for (const [target, values] of [
    [['network'], 'network'],
    [['service-base', 'identity'], 'services/identity/base'],
    [['service', 'identity'], 'services/identity'],
  ]) {
    it(`plans ${target.join(' ')} with common.tfvars before the stack values`, () => {
      const { status, calls } = deploy.run('dev', ['plan', ...target]);

      assert.equal(status, 0);
      const plan = calls.find((call) => call.includes(' plan '));
      const common = `-var-file=${TERRAFORM_ROOT}/environments/dev/common.tfvars`;
      const stack = `-var-file=${TERRAFORM_ROOT}/environments/dev/${values}/terraform.tfvars`;
      assert.ok(plan.includes(`${common} ${stack}`), plan);
    });
  }

  it('initializes service-base and service against their own states', () => {
    const base = deploy.run('dev', ['plan', 'service-base', 'identity']).calls;
    const service = deploy.run('dev', ['plan', 'service', 'identity']).calls;

    assert.ok(
      base[0].includes(`-chdir=${TERRAFORM_ROOT}/stacks/service-base init`) &&
        base[0].includes(
          `-backend-config=${TERRAFORM_ROOT}/environments/dev/services/identity/base/backend.tfvars`,
        ),
      base[0],
    );
    assert.ok(
      service[0].includes(`-chdir=${TERRAFORM_ROOT}/stacks/service init`) &&
        service[0].includes(
          `-backend-config=${TERRAFORM_ROOT}/environments/dev/services/identity/backend.tfvars`,
        ),
      service[0],
    );
  });

  it('stops before terraform when the environment has no common.tfvars', () => {
    const { status, stderr, calls } = deploy.run('qa', ['plan', 'network']);

    assert.equal(status, 1);
    assert.match(stderr, /environments\/qa\/common\.tfvars does not exist/);
    assert.deepEqual(calls, []);
  });
});
