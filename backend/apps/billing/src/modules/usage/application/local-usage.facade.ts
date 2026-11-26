import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { UsageMetric } from '@contracts/billing';
import { MemberRoster } from '../domain/member-roster.js';
import { UsageLedger, type UsageLevel } from '../domain/usage-ledger.js';
import { UsageFacade } from './usage.facade.js';

/**
 * In-process `UsageFacade`. Users are not measured per day: today's members count, which is what
 * the quota limits when adding one.
 */
@Injectable()
export class LocalUsageFacade extends UsageFacade {
  constructor(
    private readonly ledger: UsageLedger,
    private readonly roster: MemberRoster,
    private readonly shard: ShardScopes,
  ) {
    super();
  }

  levels(
    tenantId: string,
    from: string,
    to: string,
  ): Promise<readonly UsageLevel[]> {
    return this.shard.inTenantShard(tenantId, async () => {
      const recorded = await this.ledger.levels(from, to);
      return [
        { metric: UsageMetric.Users, used: await this.roster.count() },
        ...recorded.filter((level) => level.metric !== UsageMetric.Users),
      ];
    });
  }
}
