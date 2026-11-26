import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ScriptRunner } from './utils/script-runner.mjs';

const DEPLOY = 'deploy-service.sh';
const runner = new ScriptRunner();

function indexOfLine(lines, fragment) {
  const index = lines.findIndex((line) => line.includes(fragment));
  assert.notEqual(index, -1, `missing a line with "${fragment}"`);
  return index;
}

function assertInOrder(lines, fragments) {
  const indexes = fragments.map((fragment) => indexOfLine(lines, fragment));
  assert.deepEqual(
    indexes,
    [...indexes].sort((a, b) => a - b),
  );
}

describe('deploy-service.sh dry run', () => {
  it('fixture-fargate without stages publishes the image, migrates, plans and applies in order', () => {
    const { status, lines } = runner.run(DEPLOY, ['dev', 'fixture-fargate']);
    assert.equal(status, 0);
    assertInOrder(lines, [
      'pnpm nx run fixture-fargate:build',
      'docker build',
      'docker push',
      'pnpm nx run fixture-fargate:migrate',
      'deploy-aws.sh plan service fixture-fargate',
      'deploy-aws.sh apply service fixture-fargate',
    ]);
    const output = lines.join('\n');
    assert.doesNotMatch(output, /aws s3 cp/);
    assert.doesNotMatch(output, /s3api/);
    assert.match(output, /docker build .*--platform linux\/arm64 /);
    assert.doesNotMatch(output, /create-repository|describe-repositories/);
  });

  it('fixture-lambda publishes the package to S3, no image, then migrates, plans and applies', () => {
    const { status, lines } = runner.run(DEPLOY, ['dev', 'fixture-lambda']);
    assert.equal(status, 0);
    const output = lines.join('\n');
    assert.match(
      output,
      /aws s3 cp \S+fixture-lambda-abc1234\.zip s3:\/\/fixture-artifacts\/lambda\/fixture-lambda\/abc1234\.zip/,
    );
    assert.match(output, /zip -qr/);
    assert.match(
      output,
      /docker build .*--target lambda --output type=local,dest=/,
    );
    assert.match(output, /docker build .*--platform linux\/arm64 /);
    assert.doesNotMatch(output, /docker push/);
    assertInOrder(lines, [
      'aws s3 cp',
      'pnpm nx run fixture-lambda:migrate',
      'deploy-aws.sh plan service fixture-lambda',
      'deploy-aws.sh apply service fixture-lambda',
    ]);
  });

  it('fixture-mixed publishes the image and the package before migrating', () => {
    const { status, lines } = runner.run(DEPLOY, ['dev', 'fixture-mixed']);
    assert.equal(status, 0);
    assertInOrder(lines, [
      'docker build',
      'aws s3 cp',
      'pnpm nx run fixture-mixed:migrate',
    ]);
  });

  it('a single stage runs only that stage', () => {
    const { status, lines } = runner.run(DEPLOY, [
      'dev',
      'fixture-fargate',
      'migrate',
    ]);
    assert.equal(status, 0);
    assert.equal(lines.at(-1), '+ pnpm nx run fixture-fargate:migrate');
    const output = lines.join('\n');
    assert.doesNotMatch(output, /deploy-aws\.sh|docker|zip/);
  });

  it('an unknown stage exits with code 2', () => {
    const { status, stderr } = runner.run(DEPLOY, [
      'dev',
      'fixture-fargate',
      'destroy-all',
    ]);
    assert.equal(status, 2);
    assert.match(stderr, /Unknown stage: destroy-all/);
  });

  it('in every service migrate runs before plan and plan before apply', () => {
    for (const service of [
      'fixture-fargate',
      'fixture-lambda',
      'fixture-mixed',
    ]) {
      const { lines } = runner.run(DEPLOY, ['dev', service]);
      const migrate = indexOfLine(lines, `:migrate`);
      const plan = indexOfLine(lines, `deploy-aws.sh plan service ${service}`);
      const apply = indexOfLine(
        lines,
        `deploy-aws.sh apply service ${service}`,
      );
      assert.ok(migrate < plan, `${service}: migrate must come before plan`);
      assert.ok(plan < apply, `${service}: plan must come before apply`);
    }
  });

  it('plan and apply load the artifacts without requiring the file in DRY_RUN', () => {
    const { status, lines } = runner.run(DEPLOY, [
      'dev',
      'fixture-fargate',
      'plan',
      'apply',
    ]);
    assert.equal(status, 0);
    assert.deepEqual(
      lines
        .filter((line) => /source|deploy-aws\.sh/.test(line))
        .map((line) => line.replace(/^\+ (env ENV=dev )?/, '')),
      [
        'source .artifacts/fixture-fargate.env',
        `${ScriptRunner.scriptsDir}/deploy-aws.sh plan service fixture-fargate`,
        'source .artifacts/fixture-fargate.env',
        `${ScriptRunner.scriptsDir}/deploy-aws.sh apply service fixture-fargate`,
      ],
    );
  });

  it('no long-lived AWS key appears in the output', () => {
    for (const service of [
      'fixture-fargate',
      'fixture-lambda',
      'fixture-mixed',
    ]) {
      const { stdout, stderr } = runner.run(DEPLOY, ['dev', service]);
      assert.doesNotMatch(
        stdout + stderr,
        /AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY/,
      );
    }
  });
});
