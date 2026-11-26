#!/usr/bin/env node
/**
 * Runs every guard of the repository: structure checks, language check, guard and rule tests, tooling lint, the lint
 * of the projects affected since the base and the format check.
 * Usage: node .claude/guards/run-gate.mjs [--base <ref>] [root]
 * Exits with 1 and the output of each failed guard, or with 0 when all pass.
 */
import { GateCommand } from './gate-command.mjs';
import { GuardGate } from './guard-gate.mjs';

/** Runs the gate a command line asks for and prints its outcome. */
class GateRun {
  /**
   * @param {GateCommand} command Parsed command line.
   */
  constructor(command) {
    this.command = command;
  }

  /**
   * Runs the gate and prints its outcome.
   * @returns {number} The exit code.
   */
  run() {
    const { passed, failed } = new GuardGate(
      this.command.root,
      this.command.base,
    ).check();
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

process.exitCode = new GateRun(new GateCommand(process.argv.slice(2))).run();
