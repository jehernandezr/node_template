import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const WORKFLOWS = join(ROOT, '.github/workflows');

/** The jobs of a workflow, each as the text of its block. */
class WorkflowJobs {
  /**
   * @param {string} text YAML of the workflow.
   */
  constructor(text) {
    this.jobs = new Map();
    const body = text.slice(text.indexOf('\njobs:\n'));
    let name;
    for (const line of body.split('\n').slice(2)) {
      const header = /^ {2}([\w-]+):\s*$/.exec(line);
      if (header !== null) {
        name = header[1];
        this.jobs.set(name, '');
      } else if (name !== undefined) {
        this.jobs.set(name, `${this.jobs.get(name)}${line}\n`);
      }
    }
  }

  /**
   * The block of a job.
   * @param {string} name Job id.
   * @returns {string} Its text, empty when the job is missing.
   */
  job(name) {
    return this.jobs.get(name) ?? '';
  }

  /**
   * The jobs a job waits for.
   * @param {string} name Job id.
   * @returns {string[]} The ids in its `needs`.
   */
  needs(name) {
    const block = this.job(name);
    const inline = /^ {4}needs:\s*\[([^\]]*)\]/m.exec(block);
    if (inline !== null) return inline[1].split(',').map((id) => id.trim());
    const list = /^ {4}needs:\s*\n((?: {6}- [\w-]+\n)+)/m.exec(block);
    return list === null
      ? []
      : [...list[1].matchAll(/- ([\w-]+)/g)].map((match) => match[1]);
  }
}

describe('CI workflow', () => {
  const ci = new WorkflowJobs(readFileSync(join(WORKFLOWS, 'ci.yml'), 'utf8'));

  it('runs the container tests as a matrix of shards, one Jest run per project', () => {
    const shards = ci.job('test-int');
    assert.match(shards, /matrix:\s*\n\s+shard: \[/);
    assert.match(shards, /-t test-int -c ci/);
    assert.doesNotMatch(shards, /--shard\b/);
  });

  it('merges the coverage of every shard in one job after them', () => {
    assert.deepEqual(ci.needs('coverage').sort(), ['changes', 'test-int']);
    assert.match(ci.job('coverage'), /coverage-report\.mjs check/);
    assert.match(ci.job('test-int'), /coverage-report\.mjs collect/);
  });

  it('makes ci-ok wait for the shards and the coverage job', () => {
    const needs = ci.needs('ci-ok');
    for (const job of ['test-int', 'coverage', 'guards', 'nx']) {
      assert.ok(needs.includes(job), `ci-ok must need ${job}`);
    }
  });

  it('smokes the service artifacts natively on ARM64 when their inputs change, and ci-ok waits for it', () => {
    const smoke = ci.job('artifact-smoke');
    assert.match(smoke, /runs-on: ubuntu-24\.04-arm/);
    assert.match(smoke, /if: needs\.changes\.outputs\.artifact == 'true'/);
    assert.match(
      smoke,
      /node backend\/infra\/scripts\/artifact-smoke-cli\.mjs/,
    );
    assert.ok(ci.needs('ci-ok').includes('artifact-smoke'));
    const filter =
      /\n {12}artifact:\n((?: {14}- .+\n)+)/.exec(ci.job('changes'))?.[1] ?? '';
    for (const path of [
      'backend/**',
      '.github/workflows/**',
      'pnpm-lock.yaml',
      '.nvmrc',
      '.dockerignore',
    ]) {
      assert.ok(
        filter.includes(`'${path}'`),
        `the artifact filter must include ${path}`,
      );
    }
  });

  it('runs the deploy smoke on the local stack natively on ARM64 when the artifacts change, and ci-ok waits for it', () => {
    const smoke = ci.job('local-smoke');
    assert.match(smoke, /runs-on: ubuntu-24\.04-arm/);
    assert.match(smoke, /if: needs\.changes\.outputs\.artifact == 'true'/);
    assert.match(smoke, /run: pnpm nx run deploy-smoke:local/);
    assert.ok(ci.needs('ci-ok').includes('local-smoke'));
  });

  it('never hands a shard the servers of another run', () => {
    const shared = readdirSync(WORKFLOWS)
      .filter((file) => /\.ya?ml$/.test(file))
      .filter((file) =>
        /NT_TEST_(POSTGRES|VALKEY|ROLE)/.test(
          readFileSync(join(WORKFLOWS, file), 'utf8'),
        ),
      );
    assert.deepEqual(shared, []);
  });
});
