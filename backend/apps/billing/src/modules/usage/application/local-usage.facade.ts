import { Injectable } from '@nestjs/common';
import { UsageMetric } from '@contracts/billing';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { MemberRoster } from '../domain/member-roster.js';
import { UsageLedger, type UsageLevel } from '../domain/usage-ledger.js';
import { UsageFacade } from './usage.facade.js';

/**
 * `UsageFacade` dentro del proceso. Los usuarios no se miden por día: cuentan los miembros de hoy, que es lo
 * que limita la cuota al agregar uno.
 */
@Injectable()
export class LocalUsageFacade extends UsageFacade {
  constructor(
    private readonly ledger: UsageLedger,
    private readonly roster: MemberRoster,
    private readonly shard: TenantShard,
  ) {
    super();
  }

  levels(
    tenantId: string,
    from: string,
    to: string,
  ): Promise<readonly UsageLevel[]> {
    return this.shard.run(tenantId, async () => {
      const recorded = await this.ledger.levels(from, to);
      return [
        { metric: UsageMetric.Users, used: await this.roster.count() },
        ...recorded.filter((level) => level.metric !== UsageMetric.Users),
      ];
    });
  }
}
