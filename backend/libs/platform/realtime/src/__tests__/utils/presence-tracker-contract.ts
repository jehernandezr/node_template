import type { PresenceTracker } from '../../presence/presence-tracker.js';

/** Lo que todo `PresenceTracker` cumple. `advance` mueve el reloj que usa el adaptador. */
export function runPresenceTrackerContract(
  name: string,
  factory: () => { tracker: PresenceTracker; advance: (ms: number) => void },
): void {
  describe(`${name} (PresenceTracker contract)`, () => {
    let channelCount = 0;
    const channel = (): string => `presence-${name}-${(channelCount += 1)}`;

    it('reports a user online while one of its connections is alive', async () => {
      const { tracker } = factory();
      const user = channel();

      await tracker.connected(user, 'c-1', 30_000);
      await tracker.connected(user, 'c-2', 30_000);
      await tracker.disconnected(user, 'c-1');

      await expect(tracker.isOnline(user)).resolves.toBe(true);
    });

    it('reports a user offline once every connection left', async () => {
      const { tracker } = factory();
      const user = channel();
      await tracker.connected(user, 'c-1', 30_000);

      await tracker.disconnected(user, 'c-1');

      await expect(tracker.isOnline(user)).resolves.toBe(false);
    });

    it('forgets a connection that stopped renewing itself', async () => {
      const { tracker, advance } = factory();
      const user = channel();
      await tracker.connected(user, 'c-1', 30_000);

      advance(30_001);

      await expect(tracker.isOnline(user)).resolves.toBe(false);
    });

    it('reports offline a user that never connected', async () => {
      const { tracker } = factory();

      await expect(tracker.isOnline(channel())).resolves.toBe(false);
    });
  });
}
