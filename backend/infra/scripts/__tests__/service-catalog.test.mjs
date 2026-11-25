import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ServiceCatalog } from '../service-catalog.mjs';
import { ScriptRunner } from './utils/script-runner.mjs';

const CLI = join(ScriptRunner.scriptsDir, 'service-catalog-cli.mjs');
const FORBIDDEN_NAMES = [
  'identity',
  'tasks',
  'notifications',
  'reports',
  'billing',
];

describe('ServiceCatalog', () => {
  let workRoot;
  const catalog = () => new ServiceCatalog(ScriptRunner.fixtureTerraformRoot);

  before(() => {
    workRoot = mkdtempSync(join(tmpdir(), 'service-catalog-'));
  });

  after(() => {
    rmSync(workRoot, { recursive: true, force: true });
  });

  it('discovers exactly the three fixture services, sorted', () => {
    const services = catalog().discover('dev');
    assert.deepEqual(
      services.map((service) => service.name),
      ['fixture-fargate', 'fixture-lambda', 'fixture-mixed'],
    );
  });

  it('computes runtime, image, package and parts of each service', () => {
    const [fargate, lambda, mixed] = catalog().discover('dev');
    assert.deepEqual(fargate, {
      name: 'fixture-fargate',
      runtime: 'fargate',
      needsImage: true,
      needsPackage: false,
      hasWorkers: false,
      hasConsumers: false,
      hasRealtime: false,
    });
    assert.deepEqual(lambda, {
      name: 'fixture-lambda',
      runtime: 'lambda',
      needsImage: false,
      needsPackage: true,
      hasWorkers: false,
      hasConsumers: false,
      hasRealtime: false,
    });
    assert.equal(mixed.runtime, 'fargate');
    assert.equal(mixed.needsImage, true);
    assert.equal(mixed.needsPackage, true);
    assert.equal(mixed.hasWorkers, true);
    assert.equal(mixed.hasConsumers, true);
  });

  it('ignores a folder without backend.tfvars', () => {
    const root = join(workRoot, 'partial');
    cpSync(ScriptRunner.fixtureTerraformRoot, root, { recursive: true });
    const services = join(root, 'environments', 'dev', 'services');
    mkdirSync(join(services, 'fixture-no-backend'));
    writeFileSync(
      join(services, 'fixture-no-backend', 'terraform.tfvars'),
      'region = "us-east-1"\n',
    );
    const names = new ServiceCatalog(root)
      .discover('dev')
      .map((service) => service.name);
    assert.deepEqual(names, [
      'fixture-fargate',
      'fixture-lambda',
      'fixture-mixed',
    ]);
  });

  it('throws if service_name does not match the folder', () => {
    const root = join(workRoot, 'mismatch');
    cpSync(ScriptRunner.fixtureTerraformRoot, root, { recursive: true });
    const file = join(
      root,
      'environments',
      'dev',
      'services',
      'fixture-lambda',
      'terraform.tfvars',
    );
    writeFileSync(
      file,
      readFileSync(file, 'utf8').replace('"fixture-lambda"', '"fixture-other"'),
    );
    assert.throws(
      () => new ServiceCatalog(root).discover('dev'),
      new Error(
        'service_name fixture-other does not match the folder fixture-lambda',
      ),
    );
  });

  it('throws with a nonexistent environment', () => {
    assert.throws(
      () => catalog().discover('nope'),
      new Error('Environment nope does not exist'),
    );
  });

  it('returns [] if the environment has no services', () => {
    const root = join(workRoot, 'empty');
    mkdirSync(join(root, 'environments', 'dev'), { recursive: true });
    assert.deepEqual(new ServiceCatalog(root).discover('dev'), []);
  });

  it('find throws with a nonexistent service', () => {
    assert.throws(
      () => catalog().find('dev', 'fixture-none'),
      new Error('Service fixture-none is not in dev'),
    );
  });

  it('the matrix CLI prints valid JSON with three elements', () => {
    const result = spawnSync(process.execPath, [CLI, 'matrix', 'dev'], {
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        TF_ROOT: ScriptRunner.fixtureTerraformRoot,
      },
    });
    assert.equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.include.length, 3);
  });

  it('the CLI exits with 1 and usage on an invalid command', () => {
    const result = spawnSync(process.execPath, [CLI], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage:/);
  });

  it('the catalog code contains no service names', () => {
    for (const file of ['service-catalog.mjs', 'service-catalog-cli.mjs']) {
      const source = readFileSync(join(ScriptRunner.scriptsDir, file), 'utf8');
      for (const name of FORBIDDEN_NAMES) {
        assert.doesNotMatch(
          source,
          new RegExp(name),
          `${file} contains ${name}`,
        );
      }
    }
  });
});
