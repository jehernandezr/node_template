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

  /**
   * How many shard databases the script creates for a service.
   * @param {string} service Service name.
   * @returns {number} The number of <service>_shard_<n> databases.
   */
  shardCountOf(service) {
    return this.databases.filter((name) =>
      new RegExp(`^${service}_shard_\\d+$`).test(name),
    ).length;
  }
}

/** The database services of an environment's data stack values. */
class DataStackValues {
  #values;

  /**
   * @param {string} path Path of the data stack terraform.tfvars.
   */
  constructor(path) {
    this.#values = new TfvarsBlockReader(readFileSync(path, 'utf8'));
  }

  /**
   * The services in db_services.
   * @returns {string[]} The service names, in order.
   */
  services() {
    return this.#values.entryNames('db_services');
  }

  /**
   * The shard count of a db_services entry, 1 when the entry leaves it out.
   * @param {string} service Service name.
   * @returns {number} The shards of the service.
   */
  shardCountOf(service) {
    const entry = this.#values
      .entries('db_services')
      .find((candidate) => candidate.name === service);
    return Number(/shards\s*=\s*(\d+)/.exec(entry?.value ?? '')?.[1] ?? 1);
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
    const values = new DataStackValues(dataTfvars);
    const services = values.services();

    it(`init.sql creates the catalog of every ${environment} database service`, () => {
      assert.deepEqual(
        services.filter((service) => !init.catalogServices().includes(service)),
        [],
      );
    });

    it(`gives every ${environment} database service the shard count of init.sql`, () => {
      for (const service of services) {
        assert.equal(
          values.shardCountOf(service),
          init.shardCountOf(service),
          `${service} must have as many shards as every other service (ADR 0032)`,
        );
      }
    });
  }
});
