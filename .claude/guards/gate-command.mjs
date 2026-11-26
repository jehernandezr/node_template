import { resolve } from 'node:path';

/** Command line of the guard gate: `[--base <ref>] [root]`, in any order. */
export class GateCommand {
  static DEFAULT_BASE = 'main';

  /**
   * @param {string[]} argv Arguments after the script name.
   */
  constructor(argv) {
    const base = argv.indexOf('--base');
    this.base = base === -1 ? GateCommand.DEFAULT_BASE : argv[base + 1];
    const rest = argv.filter(
      (_, index) => base === -1 || (index !== base && index !== base + 1),
    );
    this.root = resolve(rest[0] ?? '.');
  }
}
