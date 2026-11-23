import { RevocationReason, RevocationScope } from '@contracts/identity';
import { RecordingRealtime } from '../../../dispatch/__tests__/utils/index.js';
import { RealtimeControlConsumer } from '../realtime-control.consumer.js';

const USER = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01';
const SESSION = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f04';

describe('RealtimeControlConsumer', () => {
  it('closes the connections of a revoked session', async () => {
    const realtime = new RecordingRealtime();

    await new RealtimeControlConsumer(realtime).onSessionRevoked({
      sessionId: SESSION,
      userId: USER,
      tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01',
      reason: RevocationReason.Logout,
      revokedAt: '2026-11-20T10:00:00.000Z',
    });

    expect(realtime.frames).toEqual([
      { userId: USER, kind: 'session-closed', data: SESSION },
    ]);
  });

  it('closes every connection of a user whose tokens were all revoked', async () => {
    const realtime = new RecordingRealtime();

    await new RealtimeControlConsumer(realtime).onTokensRevoked({
      scope: RevocationScope.User,
      subjectId: USER,
      revokedBefore: '2026-11-20T10:00:00.000Z',
    });

    expect(realtime.frames).toEqual([
      { userId: USER, kind: 'all-sessions-closed', data: null },
    ]);
  });

  it('leaves the reconnection check to a tenant wide revocation', async () => {
    const realtime = new RecordingRealtime();

    await new RealtimeControlConsumer(realtime).onTokensRevoked({
      scope: RevocationScope.Tenant,
      subjectId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01',
      revokedBefore: '2026-11-20T10:00:00.000Z',
    });

    expect(realtime.frames).toEqual([]);
  });
});
