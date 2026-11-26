import assert from 'node:assert/strict';
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, it } from 'node:test';
import { ScriptRunner } from './utils/script-runner.mjs';

const BOOTSTRAP = 'bootstrap-account.sh';
const TERRAFORM_ROOT = resolve(ScriptRunner.scriptsDir, '../terraform');
const runner = new ScriptRunner();

/** An `aws` command on PATH that records its arguments and answers as an account whose state bucket already exists. */
class FakeAwsCli {
  constructor() {
    this.dir = mkdtempSync(join(tmpdir(), 'bootstrap-account-'));
    this.log = join(this.dir, 'calls.log');
    const script = join(this.dir, 'aws');
    writeFileSync(
      script,
      [
        '#!/usr/bin/env bash',
        `printf '%s\\n' "$*" >> '${this.log}'`,
        'if [[ "$1" == sts ]]; then echo 111111111111; fi',
        'exit 0',
        '',
      ].join('\n'),
    );
    chmodSync(script, 0o755);
  }

  calls() {
    return readFileSync(this.log, 'utf8').trim().split('\n');
  }

  remove() {
    rmSync(this.dir, { recursive: true, force: true });
  }
}

const indexOf = (lines, fragment) => {
  const index = lines.findIndex((line) => line.includes(fragment));
  assert.notEqual(index, -1, `missing a line with "${fragment}"`);
  return index;
};

describe('bootstrap-account.sh dry run', () => {
  it('creates the dev state bucket of the backend file in us-east-1, then makes it private, versioned, KMS-encrypted and TLS-only', () => {
    const { status, lines } = runner.run(BOOTSTRAP, ['dev'], {
      TF_ROOT: TERRAFORM_ROOT,
    });

    assert.equal(status, 0);
    const steps = [
      'aws s3api head-bucket --bucket node-template-dev-tfstate --expected-bucket-owner',
      'aws s3api create-bucket --bucket node-template-dev-tfstate --region us-east-1',
      'aws s3api put-public-access-block --bucket node-template-dev-tfstate',
      'aws s3api put-bucket-ownership-controls --bucket node-template-dev-tfstate',
      'aws s3api put-bucket-versioning --bucket node-template-dev-tfstate --region us-east-1 --versioning-configuration Status=Enabled',
      'aws s3api put-bucket-encryption --bucket node-template-dev-tfstate',
      'aws s3api put-bucket-policy --bucket node-template-dev-tfstate',
    ];
    const positions = steps.map((step) => indexOf(lines, step));
    assert.deepEqual(
      [...positions].sort((a, b) => a - b),
      positions,
    );
    const output = lines.join('\n');
    assert.doesNotMatch(output, /LocationConstraint/);
    assert.match(
      output,
      /BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true/,
    );
    assert.match(output, /"SSEAlgorithm":"aws:kms"},"BucketKeyEnabled":true/);
    assert.match(output, /"aws:SecureTransport":"false"/);
  });

  for (const environment of ['dev', 'staging', 'prod']) {
    it(`reads the bucket of ${environment} from its global backend file`, () => {
      const { status, lines } = runner.run(BOOTSTRAP, [environment], {
        TF_ROOT: TERRAFORM_ROOT,
      });

      assert.equal(status, 0);
      indexOf(
        lines,
        `create-bucket --bucket node-template-${environment}-tfstate`,
      );
    });
  }

  it('passes the location constraint outside us-east-1', () => {
    const { status, lines } = runner.run(BOOTSTRAP, ['dev']);

    assert.equal(status, 0);
    indexOf(
      lines,
      'create-bucket --bucket fixture-dev-tfstate --region eu-west-1 --create-bucket-configuration LocationConstraint=eu-west-1',
    );
  });

  it('fails without a global backend file', () => {
    const { status, stderr, lines } = runner.run(BOOTSTRAP, ['qa'], {
      TF_ROOT: TERRAFORM_ROOT,
    });

    assert.notEqual(status, 0);
    assert.match(
      stderr,
      /environments\/qa\/global\/backend\.tfvars does not exist/,
    );
    assert.deepEqual(lines, []);
  });

  it('rejects an environment that is not an identifier', () => {
    const { status, lines } = runner.run(BOOTSTRAP, ['../dev']);

    assert.notEqual(status, 0);
    assert.deepEqual(lines, []);
  });
});

describe('bootstrap-account.sh against an account that already has its bucket', () => {
  const aws = new FakeAwsCli();
  after(() => aws.remove());

  it('keeps the bucket and applies its settings again', () => {
    const { status } = runner.run(BOOTSTRAP, ['dev'], {
      DRY_RUN: '0',
      TF_ROOT: TERRAFORM_ROOT,
      PATH: `${aws.dir}:${process.env.PATH}`,
    });

    assert.equal(status, 0);
    const calls = aws.calls();
    assert.ok(
      calls.some((call) =>
        call.includes(
          's3api head-bucket --bucket node-template-dev-tfstate --expected-bucket-owner 111111111111',
        ),
      ),
    );
    assert.ok(!calls.some((call) => call.includes('create-bucket')));
    for (const operation of [
      'put-public-access-block',
      'put-bucket-ownership-controls',
      'put-bucket-versioning',
      'put-bucket-encryption',
      'put-bucket-policy',
    ]) {
      assert.ok(
        calls.some((call) => call.includes(`s3api ${operation} `)),
        operation,
      );
    }
  });
});
