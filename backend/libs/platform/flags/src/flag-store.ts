import type { FlagRule } from './flag-rule.js';

/** Where the flag rules come from. */
export abstract class FlagStore {
  /**
   * Reads every flag rule.
   * @returns The rules.
   */
  abstract rules(): Promise<readonly FlagRule[]>;
}
