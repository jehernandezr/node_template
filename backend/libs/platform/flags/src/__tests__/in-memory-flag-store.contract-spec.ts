import { InMemoryFlagStore } from '../in-memory-flag-store.js';
import { runFlagStoreContract } from './utils/index.js';

runFlagStoreContract(
  'InMemoryFlagStore',
  (rules) => new InMemoryFlagStore(rules),
);

describe('InMemoryFlagStore', () => {
  it('replaces the rule of a flag that is put again', async () => {
    const store = new InMemoryFlagStore([
      { flag: 'new_reports', enabled: false, rolloutPercent: 0 },
    ]);

    store.put({ flag: 'new_reports', enabled: true, rolloutPercent: 50 });

    await expect(store.rules()).resolves.toEqual([
      { flag: 'new_reports', enabled: true, rolloutPercent: 50 },
    ]);
  });

  it('forgets a removed flag', async () => {
    const store = new InMemoryFlagStore([
      { flag: 'new_reports', enabled: true, rolloutPercent: 0 },
    ]);

    store.remove('new_reports');

    await expect(store.rules()).resolves.toEqual([]);
  });
});
