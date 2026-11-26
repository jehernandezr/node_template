#!/usr/bin/env node
/**
 * Runs every guard of the repository: structure checks, language check, guard and rule tests, tooling lint, the lint
 * of the projects affected since the base and the format check.
 * Usage: node .claude/guards/run-gate.mjs [--base <ref>] [root]
 * Exits with 1 and the output of each failed guard, or with 0 when all pass.
 */
import { resolve } from 'node:path';
import { GuardGate } from './guard-gate.mjs';

/** Command line of the gate. */
class GateCommand {
  /**
   * @param {string[]} argv Arguments after the script name.
   */
  constructor(argv) {
    const base = argv.indexOf('--base');
    this.base = base === -1 ? 'main' : argv[base + 1];
    const rest = argv.filter(
      (_, index) => index !== base && index !== base + 1,
    );
    this.root = resolve(rest[0] ?? '.');
  }

  /**
   * Runs the gate and prints its outcome.
   * @returns {number} The exit code.
   */
  run() {
    const { passed, failed } = new GuardGate(this.root, this.base).check();
    if (passed) {
      console.log('Guard gate: green');
      return 0;
    }
    console.error(
      `Guard gate: red (${failed.map((step) => step.name).join(', ')})\n\n${failed
        .map((step) => `== ${step.name}\n${step.output}`)
        .join('\n\n')}`,
    );
    return 1;
  }
}

process.exitCode = new GateCommand(process.argv.slice(2)).run();
