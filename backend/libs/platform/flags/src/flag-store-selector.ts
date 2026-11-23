import { ConfigFlagStore } from './config-flag-store.js';
import type { FlagStore } from './flag-store.js';
import { FlagStoreKind } from './flag-store-kind.enum.js';
import type { FlagsSettings } from './flags.config.js';
import { InMemoryFlagStore } from './in-memory-flag-store.js';

/** Arma el `FlagStore` que pide `FLAGS_STORE`, sembrado con las reglas de `FEATURE_FLAGS`. */
export class FlagStoreSelector {
  select(settings: FlagsSettings): FlagStore {
    switch (settings.FLAGS_STORE) {
      case FlagStoreKind.Config:
        return new ConfigFlagStore(settings.FEATURE_FLAGS);
      case FlagStoreKind.Memory:
        return new InMemoryFlagStore(settings.FEATURE_FLAGS);
    }
  }
}
