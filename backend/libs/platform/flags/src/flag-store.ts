import type { FlagRule } from './flag-rule.js';

/** Where the flag rules come from. */
export abstract class FlagStore {
  abstract rules(): Promise<readonly FlagRule[]>;
}
