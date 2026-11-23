import { UserStatus } from '@contracts/identity';
import { User } from '../user.js';

const ana = () =>
  User.rehydrate({
    id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01',
    homeTenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01',
    email: 'ana@example.com',
    emailFingerprint: Buffer.from('fingerprint'),
    emailVerifiedAt: new Date('2026-11-01T00:00:00.000Z'),
    status: UserStatus.Suspended,
    displayName: 'Ana',
    locale: 'es',
    lastTenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01',
  });

describe('User.erase', () => {
  it('keeps a deleted row without the email, the name or the last tenant of the person', () => {
    const user = ana();

    expect(user.erase()).toBe(true);
    expect(user.snapshot()).toEqual({
      id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01',
      homeTenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01',
      email: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01@erased.invalid',
      emailFingerprint: Buffer.from('0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01'),
      status: UserStatus.Deleted,
      displayName: '-',
      locale: 'es',
    });
  });

  it('erases once', () => {
    const user = ana();
    user.erase();

    expect(user.erase()).toBe(false);
  });
});
