import { UsageMetric } from '@contracts/billing';
import {
  MembershipChangeKind,
  type MembershipChangedPayload,
} from '@contracts/identity';
import { InMemoryTransactionManager } from '@platform/messaging/test-utils';
import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import {
  InMemoryMemberRoster,
  InMemoryUsageLedger,
} from '../../__tests__/utils/index.js';
import { LocalUsageFacade } from '../local-usage.facade.js';
import { TrackMembership } from '../track-membership.use-case.js';

const TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
const ANA = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01';
const LUIS = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b02';

class MembershipHarness {
  private readonly roster = new InMemoryMemberRoster();
  private readonly shard = UnroutedShardScopes.create();
  private readonly tracker = new TrackMembership(
    this.roster,
    this.shard,
    new InMemoryTransactionManager(),
  );

  change(userId: string, kind: MembershipChangeKind): Promise<void> {
    const change: MembershipChangedPayload = {
      tenantId: TENANT,
      userId,
      kind,
      groupIds: [],
      changedAt: '2026-11-02T10:00:00.000Z',
    };
    return this.tracker.execute(change);
  }

  async billableUsers(): Promise<number | undefined> {
    const levels = await new LocalUsageFacade(
      new InMemoryUsageLedger(),
      this.roster,
      this.shard,
    ).levels(TENANT, '2026-11-01', '2026-11-30');
    return levels.find((level) => level.metric === UsageMetric.Users)?.used;
  }
}

describe('TrackMembership', () => {
  it('counts every member identity adds as a billable user', async () => {
    const harness = new MembershipHarness();

    await harness.change(ANA, MembershipChangeKind.Added);
    await harness.change(LUIS, MembershipChangeKind.Added);

    await expect(harness.billableUsers()).resolves.toBe(2);
  });

  it('counts a member whose addition arrives twice once', async () => {
    const harness = new MembershipHarness();

    await Promise.all([
      harness.change(ANA, MembershipChangeKind.Added),
      harness.change(ANA, MembershipChangeKind.Added),
    ]);

    await expect(harness.billableUsers()).resolves.toBe(1);
  });

  it('stops counting a member identity removes', async () => {
    const harness = new MembershipHarness();
    await harness.change(ANA, MembershipChangeKind.Added);
    await harness.change(LUIS, MembershipChangeKind.Added);

    await harness.change(ANA, MembershipChangeKind.Removed);

    await expect(harness.billableUsers()).resolves.toBe(1);
  });

  it('ignores a change of groups, which does not change who is a member', async () => {
    const harness = new MembershipHarness();
    await harness.change(ANA, MembershipChangeKind.Added);

    await harness.change(ANA, MembershipChangeKind.GroupsChanged);

    await expect(harness.billableUsers()).resolves.toBe(1);
  });
});
