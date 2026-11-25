import { FixedClock } from '@platform/kernel/test-utils';
import {
  InMemoryEphemeralStore,
  runEphemeralStoreContract,
} from '../../__tests__/utils/index.js';

runEphemeralStoreContract('InMemoryEphemeralStore', async () => {
  const clock = new FixedClock(new Date('2026-11-16T10:00:00.000Z'));
  return {
    store: new InMemoryEphemeralStore(clock),
    key: (name) => name,
    clock,
  };
});

describe('InMemoryEphemeralStore', () => {
  it('lets keys expire with the clock', async () => {
    const clock = new FixedClock(new Date('2026-11-16T10:00:00.000Z'));
    const store = new InMemoryEphemeralStore(clock);
    await store.set('a', 'one', 1_000);

    clock.advance(1_000);

    await expect(store.get('a')).resolves.toBeUndefined();
    expect(store.keys()).toEqual([]);
  });
});
