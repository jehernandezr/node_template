import assert from 'node:assert/strict';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, it } from 'node:test';
import { EnvironmentMocks } from '../environment-mocks.mjs';
import { ScriptRunner } from './utils/script-runner.mjs';

const TERRAFORM = resolve(ScriptRunner.scriptsDir, '../terraform');

/** A copy of the real topology and the dev tfvars whose platform and data values a test can rewrite. */
class MockedTerraform {
  root = mkdtempSync(join(tmpdir(), 'environment-mocks-'));

  constructor() {
    cpSync(join(TERRAFORM, 'topology.json'), join(this.root, 'topology.json'));
    cpSync(
      join(TERRAFORM, 'environments', 'dev'),
      join(this.root, 'environments', 'dev'),
      { recursive: true },
    );
  }

  write(stack, text) {
    writeFileSync(
      join(this.root, 'environments', 'dev', stack, 'terraform.tfvars'),
      text,
    );
    return new EnvironmentMocks(this.root, 'dev');
  }

  remove() {
    rmSync(this.root, { recursive: true, force: true });
  }
}

const topology = JSON.parse(
  readFileSync(join(TERRAFORM, 'topology.json'), 'utf8'),
);

describe('EnvironmentMocks', () => {
  const terraform = new MockedTerraform();
  after(() => terraform.remove());

  it('mocks no realtime ALB, SES or files bucket while the platform tfvars leave them commented out', () => {
    const platform = terraform
      .write(
        'platform',
        [
          '# realtime_alb_certificate_arn = "arn:aws:acm:us-east-1:111111111111:certificate/x"',
          '# ses_domain = "dev.example.com"',
          '# files_cors_allowed_origins = ["https://app.dev.example.com"]',
        ].join('\n'),
      )
      .platform();

    assert.equal(platform.realtime_alb, null);
    assert.equal(platform.ses, null);
    assert.equal(platform.files_bucket, null);
    assert.notEqual(platform.api_alb, null);
  });

  it('mocks the realtime ALB, SES and the files bucket once the platform tfvars set them', () => {
    const mocks = terraform.write(
      'platform',
      [
        'realtime_alb_certificate_arn = "arn:aws:acm:us-east-1:111111111111:certificate/x"',
        'ses_domain = "dev.example.com"',
        'files_cors_allowed_origins = ["https://app.dev.example.com"]',
      ].join('\n'),
    );

    assert.notEqual(mocks.platform().realtime_alb, null);
    assert.notEqual(mocks.platform().ses, null);
    assert.notEqual(mocks.platform().files_bucket, null);
    assert.ok('ses-events' in mocks.messaging().queue_arns);
  });

  it('mocks no compute when the platform tfvars turn it off', () => {
    const platform = terraform
      .write(
        'platform',
        'compute_enabled = false\nrealtime_alb_certificate_arn = "arn:aws:acm:us-east-1:111111111111:certificate/x"\n',
      )
      .platform();

    assert.equal(platform.ecs_cluster, null);
    assert.equal(platform.api_alb, null);
    assert.equal(platform.realtime_alb, null);
  });

  it('derives every service access from the producers and consumer of topology.json', () => {
    const access = terraform.write('platform', '').messaging().service_access;

    for (const queue of topology.queues) {
      assert.ok(
        access[queue.consumer].consume_queues.includes(queue.name),
        `${queue.consumer} consumes ${queue.name}`,
      );
      for (const producer of queue.producers ?? []) {
        assert.ok(access[producer].send_queues.includes(queue.name));
      }
    }
    for (const topic of topology.topics) {
      for (const producer of topic.producers ?? []) {
        assert.ok(access[producer].publish_topics.includes(topic.name));
      }
    }
    for (const [service, { consume_queues: queues }] of Object.entries(
      access,
    )) {
      assert.deepEqual(
        queues,
        topology.queues
          .filter((queue) => queue.consumer === service)
          .map((queue) => queue.name)
          .sort(),
      );
    }
  });

  it('mocks the databases and Valkey users of the services in the data tfvars only', () => {
    const data = terraform
      .write(
        'data',
        'db_services = {\n  identity = { shards = 2, catalog = "owner" }\n}\nvalkey_services = ["identity"]\n',
      )
      .data();

    assert.deepEqual(Object.keys(data.service_databases), ['identity']);
    assert.deepEqual(Object.keys(data.db_service_secret_arns), ['identity']);
    assert.deepEqual(Object.keys(data.valkey.user_names), ['identity']);
  });

  it('renders one override_data block per remote state', () => {
    const hcl = terraform.write('platform', '').overrides(['network', 'data']);

    assert.match(hcl, /target = data\.terraform_remote_state\.network/);
    assert.match(hcl, /target = data\.terraform_remote_state\.data/);
    assert.equal(hcl.match(/override_data \{/g).length, 2);
  });
});
