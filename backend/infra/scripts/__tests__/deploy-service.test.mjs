import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ScriptRunner } from './utils/script-runner.mjs';

const DEPLOY = 'deploy-service.sh';
const runner = new ScriptRunner();

function indexOfLine(lines, fragment) {
  const index = lines.findIndex((line) => line.includes(fragment));
  assert.notEqual(index, -1, `falta una línea con "${fragment}"`);
  return index;
}

function assertInOrder(lines, fragments) {
  const indexes = fragments.map((fragment) => indexOfLine(lines, fragment));
  assert.deepEqual(
    indexes,
    [...indexes].sort((a, b) => a - b),
  );
}

describe('deploy-service.sh en seco', () => {
  it('fixture-fargate sin etapas publica imagen, migra, planea y aplica en orden', () => {
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
  });

  it('fixture-lambda publica el paquete en S3, no imagen, y luego migra, planea y aplica', () => {
    const { status, lines } = runner.run(DEPLOY, ['dev', 'fixture-lambda']);
    assert.equal(status, 0);
    const output = lines.join('\n');
    assert.match(output, /aws s3 cp .*fixture-lambda-abc1234\.zip/);
    assert.match(output, /zip -qr/);
    assert.doesNotMatch(output, /docker build/);
    assertInOrder(lines, [
      'aws s3 cp',
      'pnpm nx run fixture-lambda:migrate',
      'deploy-aws.sh plan service fixture-lambda',
      'deploy-aws.sh apply service fixture-lambda',
    ]);
  });

  it('fixture-mixed publica imagen y paquete antes de migrar', () => {
    const { status, lines } = runner.run(DEPLOY, ['dev', 'fixture-mixed']);
    assert.equal(status, 0);
    assertInOrder(lines, [
      'docker build',
      'aws s3 cp',
      'pnpm nx run fixture-mixed:migrate',
    ]);
  });

  it('una etapa suelta corre solo esa etapa', () => {
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

  it('una etapa desconocida sale con código 2', () => {
    const { status, stderr } = runner.run(DEPLOY, [
      'dev',
      'fixture-fargate',
      'destruir',
    ]);
    assert.equal(status, 2);
    assert.match(stderr, /Etapa desconocida: destruir/);
  });

  it('en cada servicio migrate va antes que plan y plan antes que apply', () => {
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
      assert.ok(migrate < plan, `${service}: migrate debe ir antes de plan`);
      assert.ok(plan < apply, `${service}: plan debe ir antes de apply`);
    }
  });

  it('plan y apply cargan los artefactos sin exigir el archivo en DRY_RUN', () => {
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

  it('no aparece ninguna clave de larga vida de AWS en la salida', () => {
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
