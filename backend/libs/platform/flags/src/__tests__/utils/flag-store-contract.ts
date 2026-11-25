import type { FlagRule } from '../../flag-rule.js';
import type { FlagStore } from '../../flag-store.js';

/** Creates the adapter under test with the rules the environment would give it. */
export type FlagStoreFactory = (rules: readonly FlagRule[]) => FlagStore;

const NEW_REPORTS: FlagRule = {
  flag: 'new_reports',
  enabled: true,
  rolloutPercent: 25,
  tenants: ['0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02'],
};

const DARK_MODE: FlagRule = {
  flag: 'dark_mode',
  enabled: false,
  rolloutPercent: 100,
};

/** What every `FlagStore` satisfies, whether config-based or in memory. */
export function runFlagStoreContract(
  name: string,
  factory: FlagStoreFactory,
): void {
  describe(`${name} (FlagStore contract)`, () => {
    it('returns no rules when the environment declares none', async () => {
      await expect(factory([]).rules()).resolves.toEqual([]);
    });

    it('returns every configured rule as declared', async () => {
      const rules = await factory([NEW_REPORTS, DARK_MODE]).rules();

      expect(rules).toHaveLength(2);
      expect(rules).toEqual(expect.arrayContaining([NEW_REPORTS, DARK_MODE]));
    });

    it('returns the same rules on every read', async () => {
      const store = factory([NEW_REPORTS]);

      await store.rules();

      await expect(store.rules()).resolves.toEqual([NEW_REPORTS]);
    });
  });
}
