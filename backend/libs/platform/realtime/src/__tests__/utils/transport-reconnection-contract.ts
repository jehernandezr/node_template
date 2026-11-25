import { Eventually } from '@platform/messaging/test-utils';
import type { PresenceTracker } from '../../presence/presence-tracker.js';
import type { RealtimePublisher } from '../../realtime-publisher.js';
import type { RealtimeClientOpener } from './realtime-client.js';
import { RealtimeTestAuth } from './realtime-test-auth.js';

/** What the test needs from a running setup: where to connect and how to publish. */
export interface MountedTransports {
  readonly auth: RealtimeTestAuth;
  /** Instance the client connects to. */
  readonly baseUrl: string;
  /** Instance it connects to when resuming; with a shared stream it can be a different one. */
  readonly resumeUrl: string;
  readonly publisher: RealtimePublisher;
  readonly presence: PresenceTracker;
}

const WAIT_MS = 5000;
const POLL_MS = 20;

/**
 * What every transport fulfills: delivers what is published, resumes without losing or repeating frames, closes on the
 * revocation of its session, stops announcing the user when the client leaves and does not let in without a token.
 */
export function runTransportReconnectionContract(
  name: string,
  mounted: () => MountedTransports,
  open: RealtimeClientOpener,
): void {
  describe(`${name} (RealtimeTransport contract)`, () => {
    const user = RealtimeTestAuth.USER_ID;

    it('delivers what is published after the user connects', async () => {
      const { auth, baseUrl, publisher } = mounted();
      await publisher.publish(user, { type: 'earlier', data: {} });
      const client = await open(baseUrl, auth.token());

      await publisher.publish(user, { type: 'notification', data: { n: 1 } });

      await Eventually.until(() => client.frames.length > 0, WAIT_MS);
      expect(client.frames).toEqual([
        { id: expect.any(String), type: 'notification', data: { n: 1 } },
      ]);
      client.close();
    });

    it('resumes after a cut with exactly the frames published while it was away', async () => {
      const { auth, baseUrl, resumeUrl, publisher } = mounted();
      const first = await open(baseUrl, auth.token());
      await publisher.publish(user, { type: 'before', data: 1 });
      await Eventually.until(
        () => first.frames.at(-1)?.type === 'before',
        WAIT_MS,
      );
      const lastSeen = first.lastEventId();
      first.close();

      await publisher.publish(user, { type: 'missed-1', data: 2 });
      await publisher.publish(user, { type: 'missed-2', data: 3 });
      const resumed = await open(resumeUrl, auth.token(), lastSeen);
      await publisher.publish(user, { type: 'live', data: 4 });

      await Eventually.until(() => resumed.frames.length === 3, WAIT_MS);
      expect(resumed.frames.map((frame) => frame.type)).toEqual([
        'missed-1',
        'missed-2',
        'live',
      ]);
      resumed.close();
    });

    it('closes the connection when its session is revoked', async () => {
      const { auth, baseUrl, publisher } = mounted();
      const sessionId = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f99';
      const client = await open(baseUrl, auth.token(sessionId));

      await publisher.publish(user, {
        type: 'session-closed',
        data: {},
        closesSession: sessionId,
      });

      await Eventually.until(() => client.closedByServer, WAIT_MS);
      expect(client.frames.at(-1)?.type).toBe('session-closed');
    });

    it('marks the user online while connected', async () => {
      const { auth, baseUrl, publisher } = mounted();
      const client = await open(baseUrl, auth.token());

      await expect(publisher.isOnline(user)).resolves.toBe(true);
      client.close();
    });

    it('stops marking the user online once the client leaves', async () => {
      const { auth, baseUrl, publisher } = mounted();
      const client = await open(baseUrl, auth.token());
      await expect(publisher.isOnline(user)).resolves.toBe(true);

      client.close();

      let online = true;
      const deadline = Date.now() + WAIT_MS;
      while (online && Date.now() < deadline) {
        online = await publisher.isOnline(user);
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      }
      expect(online).toBe(false);
    });

    it('rejects a connection without a valid token', async () => {
      const { auth, baseUrl } = mounted();

      const client = await open(baseUrl, auth.forgedToken());

      expect(client.rejected).toBe(true);
    });
  });
}
