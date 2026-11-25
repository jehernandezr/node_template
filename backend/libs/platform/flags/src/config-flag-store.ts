import type { FlagRule } from './flag-rule.js';
import { FlagStore } from './flag-store.js';

/** Fixed rules that come validated from the environment configuration (`FEATURE_FLAGS`). */
export class ConfigFlagStore extends FlagStore {
  constructor(private readonly configured: readonly FlagRule[]) {
    super();
  }

  async rules(): Promise<readonly FlagRule[]> {
    return this.configured;
  }
}
