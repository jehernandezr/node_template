import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ScriptRunner } from './utils/script-runner.mjs';

const runner = new ScriptRunner();

describe('read-global-outputs.sh dry run', () => {
  it('reads the artifacts bucket and the ECR prefix from the global stack of the environment', () => {
    const { status, stdout, stderr, lines } = runner.run(
      'read-global-outputs.sh',
      ['dev'],
    );

    assert.equal(status, 0);
    assert.match(
      lines[0],
      /terraform -chdir=\S+\/stacks\/global init .*-backend-config=\S+\/environments\/dev\/global\/backend\.tfvars$/,
    );
    assert.match(stderr, /stacks\/global output -raw artifacts_bucket/);
    assert.match(stderr, /stacks\/global output -raw ecr_repository_prefix/);
    assert.match(stdout, /^ARTIFACTS_BUCKET=<dry-run>$/m);
    assert.match(stdout, /^ECR_PREFIX=<dry-run>$/m);
  });
});
