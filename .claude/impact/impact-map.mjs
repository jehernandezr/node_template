#!/usr/bin/env node
/**
 * Prints the starting impact map of the branch for the reviewer.
 * Usage: node .claude/impact/impact-map.mjs [--base <ref>] [--head <ref>] [--json] [--no-nx] [root]
 *   --base is the ref the branch is compared with (main by default) and --head the tip of the change (HEAD by
 *   default); --no-nx skips the affected projects.
 */
import { resolve } from 'node:path';
import { ImpactMapBuilder } from './impact-map-builder.mjs';

/** Command line of the impact map. */
class ImpactMapCommand {
  /**
   * @param {string[]} argv Arguments after the script name.
   */
  constructor(argv) {
    const base = argv.indexOf('--base');
    const head = argv.indexOf('--head');
    this.base = base === -1 ? 'main' : argv[base + 1];
    this.head = head === -1 ? 'HEAD' : argv[head + 1];
    this.json = argv.includes('--json');
    this.nx = !argv.includes('--no-nx');
    const root = argv.find(
      (arg, index) =>
        !arg.startsWith('--') && index !== base + 1 && index !== head + 1,
    );
    this.root = resolve(root ?? '.');
  }

  /**
   * Builds and prints the map.
   * @returns {number} The exit code.
   */
  run() {
    const builder = new ImpactMapBuilder(
      this.root,
      this.base,
      this.nx ? { head: this.head } : { head: this.head, affected: () => [] },
    );
    const map = builder.build();
    console.log(
      this.json ? JSON.stringify(map, null, 2) : ImpactMapBuilder.markdown(map),
    );
    return 0;
  }
}

process.exitCode = new ImpactMapCommand(process.argv.slice(2)).run();
