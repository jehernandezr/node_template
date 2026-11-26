import {
  RevocationReason,
  RevocationScope,
  SessionRevokedEvent,
  TokensRevokedEvent,
} from '@contracts/identity';
import { DispatchOutcome, type MessageDispatcher } from '@platform/messaging';
import { RecordingRealtime } from '../../../dispatch/__tests__/utils/index.js';
import { RealtimeControlConsumer } from '../realtime-control.consumer.js';
import { ConsumerDispatcher, PlacedTenants } from './utils/index.js';

const USER = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01';
const HOME_TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
const SESSION = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f04';

const delivery = (id: string, type: string, data: unknown): unknown => ({
  specversion: '1.0',
  id,
  type,
  source: 'identity',
  time: '2026-11-20T10:00:00.000Z',
  datacontenttype: 'application/json',
  tenantid: HOME_TENANT,
  data,
});

function setup(): {
  realtime: RecordingRealtime;
  dispatcher: MessageDispatcher;
} {
  const realtime = new RecordingRealtime();
  const consumer = new RealtimeControlConsumer(realtime);
  const dispatcher = ConsumerDispatcher.create(new PlacedTenants(HOME_TENANT));
  dispatcher.register(SessionRevokedEvent, (data) =>
    consumer.onSessionRevoked(data),
  );
  dispatcher.register(TokensRevokedEvent, (data) =>
    consumer.onTokensRevoked(data),
  );
  return { realtime, dispatcher };
}

describe('RealtimeControlConsumer through the message dispatcher', () => {
  it('closes the connections of a revoked session', async () => {
    const { realtime, dispatcher } = setup();

    const result = await dispatcher.dispatch(
      delivery(
        '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9e11',
        SessionRevokedEvent.type,
        {
          sessionId: SESSION,
          userId: USER,
          tenantId: HOME_TENANT,
          reason: RevocationReason.Logout,
          revokedAt: '2026-11-20T10:00:00.000Z',
        },
      ),
      { receiveCount: 1 },
    );

    expect(result.outcome).toBe(DispatchOutcome.Processed);
    expect(realtime.frames).toEqual([
      { userId: USER, kind: 'session-closed', data: SESSION },
    ]);
  });

  it('closes every connection of a user whose tokens were revoked, published in the home tenant', async () => {
    const { realtime, dispatcher } = setup();

    const result = await dispatcher.dispatch(
      delivery(
        '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9e12',
        TokensRevokedEvent.type,
        {
          scope: RevocationScope.User,
          subjectId: USER,
          revokedBefore: '2026-11-20T10:00:00.000Z',
        },
      ),
      { receiveCount: 1 },
    );

    expect(result.outcome).toBe(DispatchOutcome.Processed);
    expect(realtime.frames).toEqual([
      { userId: USER, kind: 'all-sessions-closed', data: null },
    ]);
  });

  it('leaves the reconnection check to a tenant wide revocation', async () => {
    const { realtime, dispatcher } = setup();

    const result = await dispatcher.dispatch(
      delivery(
        '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9e13',
        TokensRevokedEvent.type,
        {
          scope: RevocationScope.Tenant,
          subjectId: HOME_TENANT,
          revokedBefore: '2026-11-20T10:00:00.000Z',
        },
      ),
      { receiveCount: 1 },
    );

    expect(result.outcome).toBe(DispatchOutcome.Processed);
    expect(realtime.frames).toEqual([]);
  });

  it('closes the session once when its revocation is delivered twice at the same time', async () => {
    const { realtime, dispatcher } = setup();
    const revoked = delivery(
      '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9e14',
      SessionRevokedEvent.type,
      {
        sessionId: SESSION,
        userId: USER,
        tenantId: HOME_TENANT,
        reason: RevocationReason.Logout,
        revokedAt: '2026-11-20T10:00:00.000Z',
      },
    );

    await Promise.all([
      dispatcher.dispatch(revoked, { receiveCount: 1 }),
      dispatcher.dispatch(revoked, { receiveCount: 1 }),
    ]);

    expect(realtime.frames).toHaveLength(1);
  });
});
