import { type Actor } from '@platform/auth';
import { ActorType } from '@platform/observability';
import { SystemClock } from '@platform/kernel';
import { InMemoryRateLimiter, RateLimitRule } from '@platform/rate-limit';
import { RateLimitGate } from '../rate-limit-gate.js';
import { RateLimitTierRules } from '../rate-limit-tier-rules.js';
import { RateLimitTier } from '../rate-limit-tier.enum.js';
import type { ClientInfo } from '../client-info.js';
import { ClientChannel } from '../client-channel.enum.js';

const client: ClientInfo = { ip: '203.0.113.7', channel: ClientChannel.Web };

describe('RateLimitGate', () => {
  it('lets the requests within the limit through', async () => {
    const gate = new RateLimitGate(
      new InMemoryRateLimiter({ clock: new SystemClock() }),
      new RateLimitTierRules(),
    );

    await expect(
      gate.check(RateLimitTier.Standard, 'ip:1'),
    ).resolves.toBeUndefined();
  });

  it('rejects the request over the limit with the wait in seconds', async () => {
    const limiter = new InMemoryRateLimiter({ clock: new SystemClock() });
    const gate = new RateLimitGate(limiter, new RateLimitTierRules());
    for (let attempt = 0; attempt < 20; attempt++) {
      await gate.check(RateLimitTier.Auth, 'ip:2');
    }

    await expect(gate.check(RateLimitTier.Auth, 'ip:2')).rejects.toMatchObject({
      code: 'PLATFORM.RATE_LIMIT.EXCEEDED',
      retryAfterSeconds: expect.any(Number),
    });
  });

  it('keys an auth request by IP even with an actor', () => {
    const actor: Actor = { kind: ActorType.System, name: 'job' };

    expect(RateLimitGate.keyFor(RateLimitTier.Auth, client, actor)).toBe(
      'ip:203.0.113.7',
    );
  });

  it('keys a request without actor by IP', () => {
    expect(RateLimitGate.keyFor(RateLimitTier.Standard, client)).toBe(
      'ip:203.0.113.7',
    );
  });

  it('keys each actor kind by its identity', () => {
    const user: Actor = {
      kind: ActorType.User,
      userId: 'user',
      tenantId: 'tenant',
      homeTenantId: 'tenant',
      sessionId: 's',
      audience: 'api' as never,
      authMethods: [],
      authTime: 0,
      roles: [],
      platformRoles: [],
      permissionVersion: '1.1',
      region: 'us',
      sessionExpiresAt: 0,
      tokenId: 't',
    };
    const account: Actor = {
      kind: ActorType.ServiceAccount,
      serviceAccountId: 'sa',
      apiKeyId: 'k',
      tenantId: 'tenant',
      permissions: [],
    };
    const system: Actor = { kind: ActorType.System, name: 'job' };

    expect(RateLimitGate.keyFor(RateLimitTier.Standard, client, user)).toBe(
      'actor:tenant:user',
    );
    expect(RateLimitGate.keyFor(RateLimitTier.Standard, client, account)).toBe(
      'actor:tenant:sa',
    );
    expect(RateLimitGate.keyFor(RateLimitTier.Standard, client, system)).toBe(
      'system:job',
    );
  });

  it('keeps the rule type exported for the tiers', () => {
    expect(RateLimitRule.define).toBeDefined();
  });
});
