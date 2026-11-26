import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { TfvarsBlockReader } from '../tfvars-block-reader.mjs';
import { ScriptRunner } from './utils/script-runner.mjs';

const ROOT = resolve(ScriptRunner.scriptsDir, '../../..');
const TERRAFORM = join(ROOT, 'backend/infra/terraform');
const ENVIRONMENTS = ['dev', 'staging', 'prod'];

/** The queues a service stack polls in one environment: the `queue` of every entry in `workers` and `consumers`. */
class DeployedQueues {
  static BLOCKS = ['workers', 'consumers'];

  constructor(text) {
    const reader = new TfvarsBlockReader(text);
    this.queues = DeployedQueues.BLOCKS.flatMap((name) =>
      (reader.block(name) ?? '')
        .split('\n')
        .filter((line) => !line.trim().startsWith('#'))
        .flatMap((line) => [...line.matchAll(/\bqueue\s*=\s*"([^"]+)"/g)]),
    ).map(([, queue]) => queue);
  }
}

const topology = JSON.parse(
  readFileSync(join(TERRAFORM, 'topology.json'), 'utf8'),
);
const contractQueuesOf = (service) =>
  topology.queues
    .filter((queue) => queue.consumer === service)
    .map((queue) => queue.name);
const consumers = [...new Set(topology.queues.map((queue) => queue.consumer))];

describe('service queues', () => {
  it('reads the queues of workers and consumers, ignoring commented entries', () => {
    const deployed = new DeployedQueues(
      [
        'workers = {',
        '  a = { queue = "svc-a", max_capacity = 2 }',
        '  # b = { queue = "svc-b" }',
        '}',
        'consumers = {',
        '  c = { queue = "svc-c", handler = "lambda.consumer" }',
        '}',
      ].join('\n'),
    );

    assert.deepEqual(deployed.queues, ['svc-a', 'svc-c']);
  });

  for (const environment of ENVIRONMENTS) {
    for (const service of consumers) {
      it(`polls every contract queue of ${service} in ${environment}`, () => {
        const tfvars = join(
          TERRAFORM,
          'environments',
          environment,
          'services',
          service,
          'terraform.tfvars',
        );
        assert.ok(existsSync(tfvars), `${tfvars} is missing`);
        const deployed = new DeployedQueues(readFileSync(tfvars, 'utf8'));

        const missing = contractQueuesOf(service).filter(
          (queue) => !deployed.queues.includes(queue),
        );

        assert.deepEqual(missing, [], `${service} in ${environment}`);
      });
    }

    it(`polls only queues of the contract in ${environment}`, () => {
      const services = join(TERRAFORM, 'environments', environment, 'services');
      for (const service of readdirSync(services)) {
        const deployed = new DeployedQueues(
          readFileSync(join(services, service, 'terraform.tfvars'), 'utf8'),
        );
        const unknown = deployed.queues.filter(
          (queue) => !contractQueuesOf(service).includes(queue),
        );

        assert.deepEqual(unknown, [], `${service} in ${environment}`);
      }
    });
  }
});
