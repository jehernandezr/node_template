import type { FlagRule } from './flag-rule.js';
import { FlagStore } from './flag-store.js';

/** Rules changed live within the process, without restarting. A new rule replaces the one for its flag. */
export class InMemoryFlagStore extends FlagStore {
  private readonly byFlag = new Map<string, FlagRule>();

  constructor(initial: readonly FlagRule[] = []) {
    super();
    initial.forEach((rule) => this.put(rule));
  }

  put(rule: FlagRule): void {
    this.byFlag.set(rule.flag, rule);
  }

  remove(flag: string): void {
    this.byFlag.delete(flag);
  }

  async rules(): Promise<readonly FlagRule[]> {
    return [...this.byFlag.values()];
  }
}
