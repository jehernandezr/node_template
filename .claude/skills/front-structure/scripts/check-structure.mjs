#!/usr/bin/env node
/**
 * Checks the front-structure, front-code and front-testing rules.
 * Usage: node check-structure.mjs [--changed | --all] [repository root]
 *   --changed (default) checks the files changed against HEAD, including new ones.
 *   --all checks all of front/.
 * Exits with code 1 and the list of violations if it finds any, and with 2 on an unknown mode, so a mistyped flag
 * never falls back to another mode silently.
 */
import { CheckMode } from './check-mode.mjs';
import { FrontStructureCheck } from './front-structure-check.mjs';
import { RuleSet } from './rules/rule-set.mjs';

const args = process.argv.slice(2);
const mode = args.find((a) => a.startsWith('--')) ?? CheckMode.CHANGED;
const root = args.find((a) => !a.startsWith('--')) ?? process.cwd();
if (!CheckMode.isValid(mode)) {
  console.error(`Unknown mode: ${mode}. Use ${CheckMode.values().join(', ')}.`);
  process.exit(2);
}
const { violations } = new FrontStructureCheck(
  root,
  mode,
  RuleSet.createDefault(),
).run();
if (violations.length > 0) {
  console.error(
    `Front rules violated (${violations.length}):\n- ${violations.join('\n- ')}`,
  );
  process.exit(1);
}
