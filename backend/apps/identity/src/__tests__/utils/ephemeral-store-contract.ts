import type { FixedClock } from '@platform/kernel/test-utils';
import type { EphemeralStore } from '../../ephemeral/ephemeral-store.js';

/** A freshly created `EphemeralStore` and, if the adapter allows it, how to advance time. */
export interface EphemeralStoreFixture {
  readonly store: EphemeralStore;
  /** Unique keys per test: the real adapter shares the server. */
  readonly key: (name: string) => string;
  readonly clock?: FixedClock;
}

/** Contract test for `EphemeralStore`: both the in-memory double and the Valkey adapter satisfy it. */
export function runEphemeralStoreContract(
  name: string,
  create: () => Promise<EphemeralStoreFixture>,
): void {
  describe(`${name} as an EphemeralStore`, () => {
    it('reads what it stores and forgets what it deletes', async () => {
      const { store, key } = await create();

      await store.set(key('a'), 'uno', 60_000);
      const read = await store.get(key('a'));
      await store.delete(key('a'));

      expect(read).toBe('uno');
      await expect(store.get(key('a'))).resolves.toBeUndefined();
    });

    it('stores only the first of two writers with setIfAbsent', async () => {
      const { store, key } = await create();

      await expect(
        store.setIfAbsent(key('b'), 'primero', 60_000),
      ).resolves.toBe(true);
      await expect(
        store.setIfAbsent(key('b'), 'segundo', 60_000),
      ).resolves.toBe(false);
      await expect(store.get(key('b'))).resolves.toBe('primero');
    });

    it('takes a value once', async () => {
      const { store, key } = await create();
      await store.set(key('c'), 'una vez', 60_000);

      const [first, second] = await Promise.all([
        store.take(key('c')),
        store.take(key('c')),
      ]);

      expect([first, second].filter((value) => value !== undefined)).toEqual([
        'una vez',
      ]);
    });

    it('counts concurrent increments without losing any and keeps the first expiry', async () => {
      const { store, key } = await create();

      const counts = await Promise.all(
        Array.from({ length: 10 }, () => store.increment(key('d'), 60_000)),
      );
      const remaining = await store.remainingMs(key('d'));

      expect([...counts].sort((a, b) => a - b)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      ]);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(60_000);
      await expect(store.remainingMs(key('nada'))).resolves.toBeUndefined();
    });

    it('extends the life of an existing key but never shortens it nor creates one', async () => {
      const { store, key } = await create();
      await store.set(key('f'), 'valor', 1_000);
      await store.set(key('g'), 'valor', 120_000);

      await store.extend(key('f'), 60_000);
      await store.extend(key('g'), 60_000);
      await store.extend(key('nada'), 60_000);

      expect(await store.remainingMs(key('f'))).toBeGreaterThan(1_000);
      expect(await store.remainingMs(key('g'))).toBeGreaterThan(60_000);
      await expect(store.get(key('nada'))).resolves.toBeUndefined();
    });

    it('keeps the last value of each field and hands the map over once', async () => {
      const { store, key } = await create();
      await store.putField(key('e'), 'k-1', 'uno', 60_000);
      await store.putField(key('e'), 'k-2', 'dos', 60_000);
      await store.putField(key('e'), 'k-1', 'tres', 60_000);

      const taken = await store.takeFields(key('e'));
      const again = await store.takeFields(key('e'));

      expect(Object.fromEntries(taken)).toEqual({
        'k-1': 'tres',
        'k-2': 'dos',
      });
      expect(again.size).toBe(0);
    });
  });
}
