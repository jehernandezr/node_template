import { ApiKeyEnvironment, ApiKeyStatus } from '@contracts/identity';
import { ApiKey } from '../api-key.js';

const NOW = new Date('2026-11-16T10:00:00.000Z');
const HOUR_MS = 3_600_000;

function aKey(expiresAt?: Date): ApiKey {
  return ApiKey.issue({
    id: 'k-1',
    tenantId: 't-1',
    serviceAccountId: 's-1',
    prefix: 'ABCDEFGHIJKL',
    secretHmac: 'h',
    environment: ApiKeyEnvironment.Live,
    ...(expiresAt === undefined ? {} : { expiresAt }),
    allowedCidrs: [],
    createdAt: NOW,
  });
}

describe('ApiKey', () => {
  it('stays usable during the rotation grace and not after it', () => {
    const key = aKey();

    key.rotate(new Date(NOW.getTime() + HOUR_MS));

    expect(key.snapshot().status).toBe(ApiKeyStatus.Rotated);
    expect(key.isUsable(new Date(NOW.getTime() + HOUR_MS - 1))).toBe(true);
    expect(key.isUsable(new Date(NOW.getTime() + HOUR_MS))).toBe(false);
  });

  it('stops working once expired or revoked', () => {
    const expiring = aKey(new Date(NOW.getTime() + HOUR_MS));
    const revoked = aKey();

    expect(expiring.isExpired(new Date(NOW.getTime() + HOUR_MS))).toBe(true);
    expect(expiring.isUsable(new Date(NOW.getTime() + HOUR_MS))).toBe(false);
    expect(revoked.revoke()).toBe(true);
    expect(revoked.revoke()).toBe(false);
    expect(revoked.isUsable(NOW)).toBe(false);
  });
});
