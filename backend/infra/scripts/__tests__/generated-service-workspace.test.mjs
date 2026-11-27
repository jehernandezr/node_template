import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { EnvironmentMocks } from '../environment-mocks.mjs';
import { GeneratedServiceWorkspace } from '../generated-service-workspace.mjs';
import { ServiceCatalog } from '../service-catalog.mjs';
import { ScriptRunner } from './utils/script-runner.mjs';

const TERRAFORM = resolve(ScriptRunner.scriptsDir, '../terraform');
const VALUES = join(
  ScriptRunner.scriptsDir,
  '__tests__',
  'utils',
  'fixtures',
  'generated-service',
  'order-history',
);

describe('GeneratedServiceWorkspace', () => {
  const workspace = new GeneratedServiceWorkspace(TERRAFORM, VALUES);
  const root = workspace.create();

  after(() => workspace.remove());

  it('places the generated service in dev next to the real values of the other stacks', () => {
    assert.equal(workspace.environment, 'dev');
    assert.equal(workspace.service, 'order-history');
    assert.deepEqual(
      new ServiceCatalog(root)
        .discover('dev')
        .map((entry) => [entry.name, entry.serviceName]),
      [['order-history', 'order_history']],
    );
    assert.equal(
      readFileSync(
        join(root, 'environments/dev/platform/terraform.tfvars'),
        'utf8',
      ),
      readFileSync(
        join(TERRAFORM, 'environments/dev/platform/terraform.tfvars'),
        'utf8',
      ),
    );
    assert.ok(
      existsSync(join(root, 'stacks/service-base/.terraform.lock.hcl')),
    );
    assert.ok(!existsSync(join(root, 'stacks/service-base/.terraform')));
  });

  it('gives the service a listener priority above every other one, under its service_name', () => {
    const real = JSON.parse(
      readFileSync(join(TERRAFORM, 'listener-priorities.json'), 'utf8'),
    );
    const copied = JSON.parse(
      readFileSync(join(root, 'listener-priorities.json'), 'utf8'),
    );

    assert.ok(copied.order_history > Math.max(...Object.values(real)));
    assert.deepEqual(
      { ...copied, order_history: undefined },
      { ...real, order_history: undefined },
    );
  });

  it('registers its databases and Valkey user in the data stack under its service_name', () => {
    const data = new EnvironmentMocks(root, 'dev', 'order-history').data();

    assert.deepEqual(Object.keys(data.service_databases), ['order_history']);
    assert.deepEqual(Object.keys(data.valkey.user_names), ['order_history']);
  });

  it('copies into the repository tmp folder and not into the system temporary folder', () => {
    assert.equal(workspace.copiesDir, resolve(TERRAFORM, '../../../tmp'));
    assert.ok(!relative(workspace.copiesDir, root).startsWith('..'));
    assert.ok(relative(tmpdir(), root).startsWith('..'));
  });

  it('removes the copy and leaves nothing behind', () => {
    const other = new GeneratedServiceWorkspace(TERRAFORM, VALUES);
    const before = readdirSync(other.copiesDir);
    const otherRoot = other.create();
    other.remove();
    other.remove();

    assert.ok(!existsSync(otherRoot));
    assert.deepEqual(readdirSync(other.copiesDir), before);
  });
});
