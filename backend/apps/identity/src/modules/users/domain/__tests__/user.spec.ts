import { UserStatus } from '@contracts/identity';
import { User } from '../user.js';

const NOW = new Date('2026-11-16T10:00:00.000Z');

function aUser(): User {
  return User.register({
    id: 'u-1',
    homeTenantId: 't-1',
    email: 'ana@example.com',
    emailFingerprint: Buffer.from('fingerprint'),
    displayName: 'Ana',
    locale: 'es',
  });
}

describe('User', () => {
  it('activates when the email is verified, once', () => {
    const user = aUser();

    expect(user.snapshot().status).toBe(UserStatus.PendingVerification);
    expect(user.verifyEmail(NOW)).toBe(true);
    expect(user.verifyEmail(NOW)).toBe(false);
    expect(user.snapshot().status).toBe(UserStatus.Active);
  });

  it('suspends and reactivates idempotently, back to pending without a verified email', () => {
    const user = aUser();

    expect(user.suspend()).toBe(true);
    expect(user.suspend()).toBe(false);
    expect(user.reactivate()).toBe(true);
    expect(user.reactivate()).toBe(false);
    expect(user.snapshot().status).toBe(UserStatus.PendingVerification);
  });

  it('changes the profile and the email', () => {
    const user = aUser();

    user.updateProfile({ displayName: 'Ana María' });
    user.changeEmail('ana.maria@example.com', Buffer.from('other'), NOW);
    user.setLastTenant('t-2');

    expect(user.snapshot()).toMatchObject({
      displayName: 'Ana María',
      locale: 'es',
      email: 'ana.maria@example.com',
      emailVerifiedAt: NOW,
      lastTenantId: 't-2',
    });
  });
});
