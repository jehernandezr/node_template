import { Injectable } from '@nestjs/common';
import { IdGenerator } from '@platform/kernel';
import { RepositoryKit, TenantIsolatedRepository } from '@platform/persistence';
import { MemberRoster } from '../../domain/member-roster.js';
import { BillingMemberEntity } from './entities/billing-member.entity.js';

/** `MemberRoster` over `billing_members` of the tenant shard. Joining or leaving twice changes nothing. */
@Injectable()
export class TypeOrmMemberRoster
  extends TenantIsolatedRepository
  implements MemberRoster
{
  constructor(
    kit: RepositoryKit,
    private readonly ids: IdGenerator,
  ) {
    super(kit);
  }

  async join(userId: string): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager
        .createQueryBuilder()
        .insert()
        .into(BillingMemberEntity)
        .values({ id: this.ids.next().toString(), tenantId, userId })
        .orIgnore()
        .execute(),
    );
  }

  async leave(userId: string): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager.delete(BillingMemberEntity, { tenantId, userId }),
    );
  }

  count(): Promise<number> {
    const tenantId = this.tenantId();
    return this.readPrimary((manager) =>
      manager.countBy(BillingMemberEntity, { tenantId }),
    );
  }
}
