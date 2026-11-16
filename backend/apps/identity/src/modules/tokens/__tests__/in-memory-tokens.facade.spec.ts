import { AuthMethodReference } from '@contracts/identity';
import { FixedClock } from '@platform/kernel/test-utils';
import { InMemoryTokensFacade } from './utils/index.js';

const START = new Date('2026-11-16T10:00:00.000Z');

describe('InMemoryTokensFacade', () => {
  it('issues an access token for the session and records the input', async () => {
    const facade = new InMemoryTokensFacade(new FixedClock(START));
    const input = {
      userId: '018f0000-0000-7000-8000-000000000001',
      tenantId: 'tenant-a',
      homeTenantId: 'tenant-a',
      sessionId: 'sesion-9',
      authMethods: [AuthMethodReference.Password],
      authTime: START,
      sessionExpiresAt: new Date('2026-12-16T10:00:00.000Z'),
    };

    const issued = await facade.issue(input);

    expect(issued.accessToken).toBe('token-for-sesion-9');
    expect(issued.accessExpiresAt.getTime()).toBe(START.getTime() + 600_000);
    expect(facade.issued).toEqual([input]);
  });
});
