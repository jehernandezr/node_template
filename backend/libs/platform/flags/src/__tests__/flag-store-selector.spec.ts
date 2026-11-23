import { ConfigFlagStore } from '../config-flag-store.js';
import { FlagStoreKind } from '../flag-store-kind.enum.js';
import { FlagStoreSelector } from '../flag-store-selector.js';
import { InMemoryFlagStore } from '../in-memory-flag-store.js';

const rules = [{ flag: 'new_reports', enabled: true, rolloutPercent: 10 }];

describe('FlagStoreSelector', () => {
  it.each([
    [FlagStoreKind.Config, ConfigFlagStore],
    [FlagStoreKind.Memory, InMemoryFlagStore],
  ])(
    'builds the %s store seeded with the configured rules',
    async (kind, type) => {
      const store = new FlagStoreSelector().select({
        FLAGS_STORE: kind,
        FEATURE_FLAGS: rules,
      });

      expect(store).toBeInstanceOf(type);
      await expect(store.rules()).resolves.toEqual(rules);
    },
  );
});
