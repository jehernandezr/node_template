import type { FlagRule } from './flag-rule.js';

/** De dónde salen las reglas de los flags. */
export abstract class FlagStore {
  abstract rules(): Promise<readonly FlagRule[]>;
}
