import { AuthStateKey } from '../auth-state-key.js';

describe('AuthStateKey', () => {
  it.each([
    [AuthStateKey.revoked('sid-1'), 'auth:revoked:sid-1'],
    [AuthStateKey.userEpoch('user-1'), 'auth:epoch:user:user-1'],
    [AuthStateKey.tenantEpoch('tenant-1'), 'auth:epoch:tenant:tenant-1'],
    [
      AuthStateKey.tenantPermissionVersion('tenant-1'),
      'auth:pv:tenant:tenant-1',
    ],
    [
      AuthStateKey.userPermissionVersion('tenant-1', 'user-1'),
      'auth:pv:user:tenant-1:user-1',
    ],
    [AuthStateKey.access('tenant-1', 'user-1'), 'auth:access:tenant-1:user-1'],
    [AuthStateKey.apiKey('abcd1234'), 'auth:apikey:abcd1234'],
  ])('builds the key %s as %s', (built, expected) => {
    expect(built).toBe(expected);
  });

  it('names the revoked index and the revocations channel', () => {
    expect(AuthStateKey.REVOKED_INDEX).toBe('auth:revoked-index');
    expect(AuthStateKey.REVOCATIONS_CHANNEL).toBe('auth:revocations');
  });

  it('places every key and channel under the auth namespace', () => {
    const prefix = `${AuthStateKey.NAMESPACE}:`;
    const all = [
      AuthStateKey.REVOKED_INDEX,
      AuthStateKey.REVOCATIONS_CHANNEL,
      AuthStateKey.revoked('sid-1'),
      AuthStateKey.userEpoch('user-1'),
      AuthStateKey.tenantEpoch('tenant-1'),
      AuthStateKey.tenantPermissionVersion('tenant-1'),
      AuthStateKey.userPermissionVersion('tenant-1', 'user-1'),
      AuthStateKey.access('tenant-1', 'user-1'),
      AuthStateKey.apiKey('abcd1234'),
    ];

    expect(all.every((key) => key.startsWith(prefix))).toBe(true);
  });
});
