import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { TfvarsBlockReader } from '../tfvars-block-reader.mjs';
import { ScriptRunner } from './utils/script-runner.mjs';

const INFRA = resolve(ScriptRunner.scriptsDir, '..');
const ENVIRONMENTS = join(INFRA, 'terraform', 'environments');
const INIT_SQL = join(INFRA, 'local', 'postgres', 'init.sql');

/** The databases a local PostgreSQL init script creates. */
class InitScript {
  constructor(path) {
    this.databases = [
      ...readFileSync(path, 'utf8').matchAll(
        /^CREATE DATABASE ([a-z0-9_]+);/gm,
      ),
    ].map((match) => match[1]);
  }

  /**
   * The services whose catalog the script creates.
   * @returns {string[]} The service names, sorted.
   */
  catalogServices() {
    return this.databases
      .filter((name) => name.endsWith('_catalog'))
      .map((name) => name.slice(0, -'_catalog'.length))
      .sort();
  }
}

describe('local databases', () => {
  const init = new InitScript(INIT_SQL);

  it('init.sql creates one catalog per service and no shared catalog', () => {
    assert.equal(init.databases.includes('catalog'), false);
    for (const name of init.databases) {
      assert.match(name, /^[a-z][a-z0-9_]*_(catalog|shard_\d+)$/);
    }
  });

  it('init.sql gives every database a service that also has its catalog', () => {
    const services = init.catalogServices();
    for (const name of init.databases) {
      assert.ok(
        services.some((service) => name.startsWith(`${service}_`)),
        `${name} has no catalog of its service`,
      );
    }
  });

  for (const environment of readdirSync(ENVIRONMENTS).sort()) {
    const dataTfvars = join(
      ENVIRONMENTS,
      environment,
      'data',
      'terraform.tfvars',
    );
    if (!existsSync(dataTfvars)) continue;
    const services = new TfvarsBlockReader(
      readFileSync(dataTfvars, 'utf8'),
    ).entryNames('db_services');

    it(`init.sql creates the catalog of every ${environment} database service`, () => {
      assert.deepEqual(
        services.filter((service) => !init.catalogServices().includes(service)),
        [],
      );
    });
  }
});
