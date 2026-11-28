import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { ServiceName } from '../service-name.mjs';
import { TfvarsBlockReader } from '../tfvars-block-reader.mjs';
import { ScriptRunner } from './utils/script-runner.mjs';

const ENVIRONMENTS = join(
  resolve(ScriptRunner.scriptsDir, '../terraform'),
  'environments',
);
const COMMON_KEYS = [
  'environment',
  'name_prefix',
  'domain',
  'main_region',
  'regions',
];
const TERRAFORM = resolve(ScriptRunner.scriptsDir, '../terraform');
const SERVICE_BASE = join(TERRAFORM, 'stacks', 'service-base');
const SERVICE = join(TERRAFORM, 'stacks', 'service');

/** The state keys a stack reads, as its remote_state.tf writes them. */
class RemoteStateKeys {
  constructor(dir) {
    this.text = readFileSync(join(dir, 'remote_state.tf'), 'utf8');
  }

  /**
   * The key one remote state reads, with the stack variables filled in.
   * @param {string} name Name of the terraform_remote_state data source.
   * @param {Record<string, string>} variables Value of each variable the key uses.
   * @returns {string} The state key.
   */
  key(name, variables) {
    return this.template(name).replace(
      /\$\{var\.([a-z0-9_]+)\}/g,
      (_, variable) => {
        assert.ok(variable in variables, `${name} key uses var.${variable}`);
        return variables[variable];
      },
    );
  }

  /**
   * The key template of one remote state, from its config or the local it names.
   * @param {string} name Name of the terraform_remote_state data source.
   * @returns {string} The template, with its `${var.*}` references.
   */
  template(name) {
    const block = this.text.match(
      new RegExp(
        `^data "terraform_remote_state" "${name}" \\{[\\s\\S]*?^\\}`,
        'm',
      ),
    );
    assert.ok(block, `remote state ${name}`);
    const key = block[0].match(/\bkey\s*=\s*(?:local\.([a-z0-9_]+)|"([^"]+)")/);
    assert.ok(key, `remote state ${name} key`);
    if (key[2] !== undefined) return key[2];
    const local = this.text.match(
      new RegExp(`^\\s*${key[1]}\\s*=\\s*"([^"]+)"`, 'm'),
    );
    assert.ok(local, `local.${key[1]}`);
    return local[1];
  }
}

/** The variables a stack declares across its .tf files. */
class StackVariables {
  constructor(dir) {
    this.names = new Set(
      readdirSync(dir)
        .filter((name) => name.endsWith('.tf'))
        .flatMap((name) => [
          ...readFileSync(join(dir, name), 'utf8').matchAll(
            /^variable\s+"([a-z0-9_]+)"/gm,
          ),
        ])
        .map((match) => match[1]),
    );
  }

  /**
   * The top-level keys of a tfvars file that the stack does not declare.
   * @param {string} text Content of the tfvars file.
   * @returns {string[]} The undeclared keys.
   */
  undeclaredIn(text) {
    return [...text.matchAll(/^([a-z0-9_]+)\s*=/gm)]
      .map((match) => match[1])
      .filter((key) => !this.names.has(key));
  }
}

/** The tfvars of one environment: its common.tfvars and every stack's terraform.tfvars. */
class EnvironmentValues {
  constructor(environment) {
    this.dir = join(ENVIRONMENTS, environment);
    this.common = new TfvarsBlockReader(
      readFileSync(join(this.dir, 'common.tfvars'), 'utf8'),
    );
  }

  reader(...path) {
    return new TfvarsBlockReader(readFileSync(join(this.dir, ...path), 'utf8'));
  }

  services() {
    const dir = join(this.dir, 'services');
    return existsSync(dir) ? readdirSync(dir).sort() : [];
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
  const serviceBase = new StackVariables(SERVICE_BASE);

  it('service-base has no variable that leaves a deployed service without Valkey', () => {
    assert.equal(serviceBase.names.has('valkey_access'), false);
    assert.ok(serviceBase.names.has('service_name'));
  });

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

    for (const folder of values.services()) {
      it(`${environment} ${folder} keeps both service states where service-base reads them`, () => {
        const region = values
          .reader('network', 'terraform.tfvars')
          .topLevelString('region');
        const bucket = `${values.common.topLevelString('name_prefix')}-tfstate`;
        const serviceName = new ServiceName(folder).terraform;
        const variables = { region, service_name: serviceName };
        const serviceBaseReads = new RemoteStateKeys(SERVICE_BASE);
        const serviceReads = new RemoteStateKeys(SERVICE);
        const stacks = [
          {
            path: [],
            keys: [serviceBaseReads.key('service', variables)],
          },
          {
            path: ['base'],
            keys: [
              serviceBaseReads.key('service_base', variables),
              serviceReads.key('service_base', variables),
            ],
          },
        ];
        for (const stack of stacks) {
          const where = join('services', folder, ...stack.path);
          const backend = values.reader(where, 'backend.tfvars');
          const tfvars = values.reader(where, 'terraform.tfvars');
          for (const key of stack.keys) {
            assert.equal(backend.topLevelString('key'), key, `${where} key`);
          }
          assert.equal(
            backend.topLevelString('bucket'),
            bucket,
            `${where} bucket`,
          );
          assert.equal(
            backend.topLevelString('region'),
            region,
            `${where} region`,
          );
          assert.equal(
            tfvars.topLevelString('region'),
            region,
            `${where} region`,
          );
          assert.equal(
            tfvars.topLevelString('state_bucket'),
            bucket,
            `${where} state_bucket`,
          );
          assert.equal(
            tfvars.topLevelString('service_name'),
            serviceName,
            `${where} service_name`,
          );
        }
      });
    }

    for (const folder of values.services()) {
      it(`${environment} ${folder} base sets only variables that service-base declares`, () => {
        const text = readFileSync(
          join(values.dir, 'services', folder, 'base', 'terraform.tfvars'),
          'utf8',
        );
        assert.deepEqual(serviceBase.undeclaredIn(text), []);
      });
    }

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
});
