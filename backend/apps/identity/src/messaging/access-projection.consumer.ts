import { Injectable } from '@nestjs/common';
import {
  MembershipChangedEvent,
  type MembershipChangedPayload,
} from '@contracts/identity';
import { Subscribe } from '@platform/messaging/nest';
import { AccessFacade } from '../modules/access/index.js';
import { UsersFacade } from '../modules/users/index.js';

/**
 * Maintains `user_tenants` from `MembershipChanged` (queue `identity-access-projection`). The use cases already
 * project after the commit so that the user sees the change right away; this consumer repairs the
 * projection if the process crashed between the commit and that write. Projecting is idempotent and reads the
 * current membership from the tenant shard, so the order of the events does not matter.
 */
@Injectable()
export class AccessProjectionConsumer {
  constructor(
    private readonly users: UsersFacade,
    private readonly access: AccessFacade,
  ) {}

  @Subscribe(MembershipChangedEvent)
  async onMembershipChanged(data: MembershipChangedPayload): Promise<void> {
    const ref = await this.users.refOf(data.userId);
    if (ref === undefined) {
      return;
    }
    await this.access.projectMembership(data.tenantId, ref);
  }
}
