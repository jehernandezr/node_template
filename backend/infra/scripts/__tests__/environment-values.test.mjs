import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { TfvarsBlockReader } from '../tfvars-block-reader.mjs';
import { ScriptRunner } from './utils/script-runner.mjs';

const ENVIRONMENTS = join(
  resolve(ScriptRunner.scriptsDir, '../terraform'),
  'environments',
);
const COMMON_KEYS = ['environment', 'name_prefix', 'domain'];
const TERRAFORM = resolve(ScriptRunner.scriptsDir, '../terraform');

/** The tfvars of one environment: its common.tfvars and every stack's terraform.tfvars. */
class EnvironmentValues {
  constructor(environment) {
    this.dir = join(ENVIRONMENTS, environment);
    this.common = new TfvarsBlockReader(
      readFileSync(join(this.dir, 'common.tfvars'), 'utf8'),
    );
  }

  stackFiles(dir = this.dir) {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return this.stackFiles(path);
      return name === 'terraform.tfvars' ? [path] : [];
    });
  }
}

describe('environment values', () => {
  for (const environment of readdirSync(ENVIRONMENTS).sort()) {
    const values = new EnvironmentValues(environment);

    it(`${environment}/common.tfvars sets the environment, its name prefix and the domain`, () => {
      assert.equal(values.common.topLevelString('environment'), environment);
      assert.match(
        values.common.topLevelString('name_prefix') ?? '',
        new RegExp(`-${environment}$`),
      );
      assert.ok(values.common.topLevelString('domain'));
    });

    it(`no ${environment} stack repeats a key of common.tfvars`, () => {
      for (const file of values.stackFiles()) {
        const text = readFileSync(file, 'utf8');
        for (const key of COMMON_KEYS) {
          assert.doesNotMatch(
            text,
            new RegExp(`^${key}\\s*=`, 'm'),
            `${relative(ENVIRONMENTS, file)} sets ${key}`,
          );
        }
      }
    });
  }

  it('listener-priorities.json gives every service of every environment its own priority', () => {
    const priorities = JSON.parse(
      readFileSync(join(TERRAFORM, 'listener-priorities.json'), 'utf8'),
    );
    const services = readdirSync(ENVIRONMENTS).flatMap((environment) => {
      const dir = join(ENVIRONMENTS, environment, 'services');
      return existsSync(dir) ? readdirSync(dir) : [];
    });

    assert.deepEqual(
      [...new Set(services)].filter((service) => !(service in priorities)),
      [],
    );
    assert.equal(
      new Set(Object.values(priorities)).size,
      Object.keys(priorities).length,
    );
  });

  it('the service environment test mocks exactly the queues of topology.json', () => {
    const topology = JSON.parse(
      readFileSync(join(TERRAFORM, 'topology.json'), 'utf8'),
    );
    const test = readFileSync(
      join(TERRAFORM, 'stacks/service/tests/environment/service.tftest.hcl'),
      'utf8',
    );
    const block = /queue_arns = \{([^}]*)\}/.exec(test)?.[1] ?? '';
    const mocked = [...block.matchAll(/"([^"]+)"\s*=/g)].map(
      ([, name]) => name,
    );

    assert.deepEqual(
      mocked.sort(),
      [...topology.queues.map((queue) => queue.name), 'ses-events'].sort(),
    );
  });
});
