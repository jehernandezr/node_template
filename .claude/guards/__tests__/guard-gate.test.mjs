import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GuardGate } from '../guard-gate.mjs';

/** Records the steps the gate runs and fails the ones it is told to. */
class ScriptedRunner {
  constructor(failing) {
    this.failing = new Set(failing);
    this.ran = [];
  }

  /**
   * Pretends to run a step.
   * @param {import('../guard-gate.mjs').GateStep} step Step of the gate.
   * @returns {{ status: number, output: string }} A failure for the scripted names.
   */
  run(step) {
    this.ran.push(step.name);
    return this.failing.has(step.name)
      ? { status: 1, output: `${step.name} failed` }
      : { status: 0, output: '' };
  }
}

describe('GuardGate', () => {
  it('runs every guard even after one fails and reports each red one', () => {
    const runner = new ScriptedRunner(['language', 'format']);
    const gate = new GuardGate('/repo', 'main', (step) => runner.run(step));

    const outcome = gate.check();

    assert.equal(outcome.passed, false);
    assert.deepEqual(
      outcome.failed.map((step) => step.name),
      ['language', 'format'],
    );
    assert.equal(runner.ran.length, gate.steps().length);
  });

  it('is green when every guard passes', () => {
    const runner = new ScriptedRunner([]);
    assert.equal(
      new GuardGate('/repo', 'main', (step) => runner.run(step)).check().passed,
      true,
    );
  });

  it('lints the projects affected since the base the cycle forked from', () => {
    const lint = new GuardGate('/repo', 'origin/main')
      .steps()
      .find((step) => step.name === 'lint of the affected projects');
    assert.ok(lint.args.includes('--base=origin/main'));
  });
});
