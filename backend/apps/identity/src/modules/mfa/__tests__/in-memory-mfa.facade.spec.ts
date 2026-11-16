import { MfaFactor } from '@contracts/identity';
import { ClientChannel } from '@platform/http';
import { PendingPurpose } from '../../../shared/enums/pending-purpose.enum.js';
import { InMemoryMfaFacade } from './utils/index.js';

const ANA = {
  userId: '018f0000-0000-7000-8000-000000000001',
  homeTenantId: 't',
};
const PENDING = {
  user: ANA,
  purpose: PendingPurpose.SignIn,
  client: { ip: '203.0.113.5', channel: ClientChannel.Web },
};

describe('InMemoryMfaFacade', () => {
  it('offers email OTP by default and numbers the challenges', async () => {
    const facade = new InMemoryMfaFacade();

    const first = await facade.startPending(PENDING);
    const second = await facade.startPending(PENDING);

    expect(first).toEqual({
      mfaToken: 'mfa-1',
      methods: [MfaFactor.EmailOtp],
    });
    expect(second.mfaToken).toBe('mfa-2');
    expect(facade.pending).toHaveLength(2);
  });

  it('offers the methods the test sets', async () => {
    const facade = new InMemoryMfaFacade();
    facade.methods = [MfaFactor.Totp, MfaFactor.RecoveryCode];

    const pending = await facade.startPending(PENDING);

    expect(pending.methods).toEqual([MfaFactor.Totp, MfaFactor.RecoveryCode]);
  });
});
