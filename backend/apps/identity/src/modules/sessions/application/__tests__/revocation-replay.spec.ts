import { RevocationScope } from '@contracts/identity';
import { InMemoryAuthState } from '@platform/auth/test-utils';
import { FixedClock } from '@platform/kernel/test-utils';
import { StaticAppConfig } from '../../../../__tests__/utils/index.js';
import { IdentitySettings } from '../../../../config/identity-settings.js';
import { RevocationReplay } from '../revocation-replay.js';

/** Shared auth state where an administrator suspends the user while the replay is in flight. */
class SuspendedMidReplayAuthState extends InMemoryAuthState {
  private suspendedOnce = false;

  constructor(private readonly userId: string) {
    super();
  }

  override async userEpoch(userId: string) {
    const epoch = await super.userEpoch(userId);
    await this.suspendOnce();
    return epoch;
  }

  override async raiseUserRevocation(
    userId: string,
    revokedBefore: number,
  ): Promise<void> {
    await this.suspendOnce();
    await super.raiseUserRevocation(userId, revokedBefore);
  }

  private async suspendOnce(): Promise<void> {
    if (this.suspendedOnce) {
      return;
    }
    this.suspendedOnce = true;
    await this.setUserEpoch(this.userId, {
      revokedBefore: 1_795_000_000,
      suspended: true,
    });
  }
}

const USER_ID = '01930000-0000-7000-8000-000000000001';

describe('RevocationReplay', () => {
  const replayOver = (state: InMemoryAuthState) =>
    new RevocationReplay(
      state,
      new IdentitySettings(new StaticAppConfig({})),
      new FixedClock(new Date('2026-11-25T10:00:00.000Z')),
    );

  describe('user', () => {
    it('keeps a suspension that lands while it raises the cut-off of the user', async () => {
      const state = new SuspendedMidReplayAuthState(USER_ID);

      await replayOver(state).user({
        scope: RevocationScope.User,
        subjectId: USER_ID,
        revokedBefore: '2026-11-25T09:59:00.000Z',
      });

      expect(await state.userEpoch(USER_ID)).toEqual({
        revokedBefore: Math.floor(
          Date.parse('2026-11-25T09:59:00.000Z') / 1000,
        ),
        suspended: true,
      });
    });

    it('never moves a later cut-off back', async () => {
      const state = new InMemoryAuthState();
      await state.setUserEpoch(USER_ID, {
        revokedBefore: 1_900_000_000,
        suspended: false,
      });

      await replayOver(state).user({
        scope: RevocationScope.User,
        subjectId: USER_ID,
        revokedBefore: '2026-11-25T09:59:00.000Z',
      });

      expect(await state.userEpoch(USER_ID)).toEqual({
        revokedBefore: 1_900_000_000,
        suspended: false,
      });
    });
  });
});
