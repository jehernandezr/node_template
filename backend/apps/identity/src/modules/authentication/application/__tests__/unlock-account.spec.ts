import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { InMemoryEphemeralStore } from '../../../../__tests__/utils/index.js';
import { LockoutRules } from '../../../../shared/constants/lockout.constants.js';
import { InMemoryUsersFacade } from '../../../users/__tests__/utils/index.js';
import { TestLoginLockout } from '../../__tests__/utils/index.js';
import { UnlockAccount } from '../unlock-account.use-case.js';

const IP = '203.0.113.20';
const HOME = '01941f29-7c00-7000-8000-000000000031';

describe('UnlockAccount', () => {
  it('lifts the lock that the failed sign-ins of the user left', async () => {
    const clock = new FixedClock(new Date('2026-11-16T10:00:00.000Z'));
    const users = new InMemoryUsersFacade(new SequentialIdGenerator());
    const { lockout, keys } = new TestLoginLockout(
      new InMemoryEphemeralStore(clock),
      clock,
    );
    const user = await users.register({
      email: 'locked@example.com',
      password: ['not', 'used', 'here'].join('-'),
      displayName: 'Locked',
      locale: 'es-MX',
      homeTenantId: HOME,
    });
    const account = keys.account('locked@example.com');
    for (
      let attempt = 0;
      attempt < LockoutRules.origin.maxFailures;
      attempt += 1
    ) {
      await lockout.recordFailure(account, IP);
    }

    await new UnlockAccount(users, lockout, keys).execute(user);

    await expect(lockout.remainingLockMs(account, IP)).resolves.toBeUndefined();
  });
});
