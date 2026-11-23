import type { FlagRule } from './flag-rule.js';
import { FlagStore } from './flag-store.js';

/** Reglas fijas que llegan validadas de la configuración del ambiente (`FEATURE_FLAGS`). */
export class ConfigFlagStore extends FlagStore {
  constructor(private readonly configured: readonly FlagRule[]) {
    super();
  }

  async rules(): Promise<readonly FlagRule[]> {
    return this.configured;
  }
}
