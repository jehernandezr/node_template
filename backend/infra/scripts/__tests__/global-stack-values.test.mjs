import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { TfvarsBlockReader } from '../tfvars-block-reader.mjs';
import { ScriptRunner } from './utils/script-runner.mjs';

const ENVIRONMENTS = join(
  resolve(ScriptRunner.scriptsDir, '../terraform'),
  'environments',
);

/** The values of one environment's global stack. */
class GlobalStackValues {
  constructor(environment) {
    const dir = join(ENVIRONMENTS, environment, 'global');
    this.backend = new TfvarsBlockReader(
      readFileSync(join(dir, 'backend.tfvars'), 'utf8'),
    );
    this.values = new TfvarsBlockReader(
      readFileSync(join(dir, 'terraform.tfvars'), 'utf8'),
    );
    this.text = readFileSync(join(dir, 'terraform.tfvars'), 'utf8');
  }

  services() {
    const list = /^services\s*=\s*\[([^\]]*)\]/m.exec(this.text)?.[1] ?? '';
    return [...list.matchAll(/"([^"]+)"/g)].map(([, service]) => service);
  }
}

describe('global stack values', () => {
  for (const environment of ['dev', 'staging', 'prod']) {
    const global = new GlobalStackValues(environment);

    it(`gives every service of ${environment} an ECR repository`, () => {
      const services = readdirSync(join(ENVIRONMENTS, environment, 'services'));

      assert.deepEqual(global.services().sort(), services.sort());
    });

    it(`keeps the ${environment} global state under global/ in the bucket of the account`, () => {
      assert.equal(
        global.backend.topLevelString('key'),
        'global/terraform.tfstate',
      );
      assert.equal(
        global.backend.topLevelString('bucket'),
        global.values.topLevelString('state_bucket'),
      );
      assert.equal(global.values.topLevelString('environment'), environment);
    });
  }
});
