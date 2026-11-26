import { Injectable } from '@nestjs/common';
import {
  RecordUsageCommand,
  type RecordUsagePayload,
} from '@contracts/billing';
import {
  MembershipChangedEvent,
  type MembershipChangedPayload,
} from '@contracts/identity';
import { Subscribe } from '@platform/messaging/nest';
import { RecordUsage } from '../application/record-usage.use-case.js';
import { TrackMembership } from '../application/track-membership.use-case.js';

/** Queues `billing-usage` (usage batches from the services) and `billing-identity` (membership changes). */
@Injectable()
export class UsageConsumer {
  constructor(
    private readonly usage: RecordUsage,
    private readonly membership: TrackMembership,
  ) {}

  /**
   * Records the usage batch of a service.
   * @param data Usage records.
   */
  @Subscribe(RecordUsageCommand)
  async onUsage(data: RecordUsagePayload): Promise<void> {
    await this.usage.execute(data);
  }

  /**
   * Updates the member roster after a membership change in identity.
   * @param data Member who joined or left.
   */
  @Subscribe(MembershipChangedEvent)
  onMembershipChanged(data: MembershipChangedPayload): Promise<void> {
    return this.membership.execute(data);
  }
}
