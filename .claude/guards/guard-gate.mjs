import { spawnSync } from 'node:child_process';

/** One command of the gate and the rule family it guards. */
export class GateStep {
  /**
   * @param {string} name What the step guards.
   * @param {string} command Executable.
   * @param {string[]} args Its arguments.
   */
  constructor(name, command, args) {
    this.name = name;
    this.command = command;
    this.args = args;
  }
}

/**
 * Runs every guard of the repository one after another, as CI does, and reports which ones failed. The `phase-cycle`
 * workflow runs it before each review, so the reviewer never receives a branch with a red guard.
 */
export class GuardGate {
  static TOOL_TESTS = [
    '.claude/guards/__tests__/*.test.mjs',
    '.claude/impact/__tests__/*.test.mjs',
    '.claude/skills/backend-structure/scripts/*.test.mjs',
    '.claude/skills/front-structure/scripts/__tests__/*.test.mjs',
    '.claude/skills/front-structure/scripts/rules/__tests__/*.test.mjs',
  ];

  /**
   * @param {string} root Repository root.
   * @param {string} base Branch the cycle forked from, for the affected lint.
   * @param {(step: GateStep) => { status: number | null, output: string }} [run] Runs one step.
   */
  constructor(root, base, run) {
    this.root = root;
    this.base = base;
    this.run = run ?? ((step) => this.spawn(step));
  }

  /**
   * The steps, cheapest first.
   * @returns {GateStep[]} Every guard.
   */
  steps() {
    return [
      new GateStep('backend structure', 'node', [
        '.claude/skills/backend-structure/scripts/check-structure.mjs',
        '--all',
        '.',
      ]),
      new GateStep('front structure', 'node', [
        '.claude/skills/front-structure/scripts/check-structure.mjs',
        '--all',
        '.',
      ]),
      new GateStep('language', 'node', [
        '.claude/guards/check-language.mjs',
        '--all',
        '.',
      ]),
      new GateStep('guard and rule tests', 'sh', [
        '-c',
        `node --test ${GuardGate.TOOL_TESTS.join(' ')}`,
      ]),
      new GateStep('tooling lint', 'pnpm', [
        'nx',
        'run',
        'backend-tooling:lint',
        '--skip-nx-cache',
      ]),
      new GateStep('lint of the affected projects', 'pnpm', [
        'nx',
        'affected',
        '-t',
        'lint',
        `--base=${this.base}`,
        '--exclude=tag:lang:dart',
        '--parallel=1',
      ]),
      new GateStep('format', 'pnpm', [
        'nx',
        'format:check',
        `--base=${this.base}`,
      ]),
    ];
  }

  /**
   * Runs every step, even after a failure, so one run lists every red guard.
   * @returns {{ passed: boolean, failed: { name: string, output: string }[] }} The outcome.
   */
  check() {
    const failed = [];
    for (const step of this.steps()) {
      const result = this.run(step);
      if (result.status !== 0) {
        failed.push({ name: step.name, output: result.output });
      }
    }
    return { passed: failed.length === 0, failed };
  }

  /**
   * Runs a step in the repository root and keeps the tail of its output.
   * @param {GateStep} step Step to run.
   * @returns {{ status: number | null, output: string }} Exit code and output.
   */
  spawn(step) {
    const result = spawnSync(step.command, step.args, {
      cwd: this.root,
      encoding: 'utf8',
      env: { ...process.env, NX_DAEMON: 'false' },
      maxBuffer: 64 * 1024 * 1024,
    });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    return {
      status: result.status,
      output: output.split('\n').slice(-60).join('\n'),
    };
  }
}
