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

  it('descubre exactamente los tres servicios del fixture, ordenados', () => {
    const services = catalog().discover('dev');
    assert.deepEqual(
      services.map((service) => service.name),
      ['fixture-fargate', 'fixture-lambda', 'fixture-mixed'],
    );
  });

  it('calcula runtime, imagen, paquete y partes de cada servicio', () => {
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

  it('ignora una carpeta sin backend.tfvars', () => {
    const root = join(workRoot, 'partial');
    cpSync(ScriptRunner.fixtureTerraformRoot, root, { recursive: true });
    const services = join(root, 'environments', 'dev', 'services');
    mkdirSync(join(services, 'fixture-sin-backend'));
    writeFileSync(
      join(services, 'fixture-sin-backend', 'terraform.tfvars'),
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

  it('lanza si service_name no coincide con la carpeta', () => {
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
      readFileSync(file, 'utf8').replace('"fixture-lambda"', '"fixture-otro"'),
    );
    assert.throws(
      () => new ServiceCatalog(root).discover('dev'),
      new Error(
        'service_name fixture-otro no coincide con la carpeta fixture-lambda',
      ),
    );
  });

  it('lanza con un ambiente inexistente', () => {
    assert.throws(
      () => catalog().discover('nope'),
      new Error('No existe el ambiente nope'),
    );
  });

  it('devuelve [] si el ambiente no tiene servicios', () => {
    const root = join(workRoot, 'empty');
    mkdirSync(join(root, 'environments', 'dev'), { recursive: true });
    assert.deepEqual(new ServiceCatalog(root).discover('dev'), []);
  });

  it('find lanza con un servicio inexistente', () => {
    assert.throws(
      () => catalog().find('dev', 'fixture-nada'),
      new Error('El servicio fixture-nada no está en dev'),
    );
  });

  it('el CLI matrix imprime JSON válido con tres elementos', () => {
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

  it('el CLI sale con 1 y uso ante un comando inválido', () => {
    const result = spawnSync(process.execPath, [CLI], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Uso:/);
  });

  it('el código de catálogo no contiene nombres de servicios', () => {
    for (const file of ['service-catalog.mjs', 'service-catalog-cli.mjs']) {
      const source = readFileSync(join(ScriptRunner.scriptsDir, file), 'utf8');
      for (const name of FORBIDDEN_NAMES) {
        assert.doesNotMatch(
          source,
          new RegExp(name),
          `${file} contiene ${name}`,
        );
      }
    }
  });
});
