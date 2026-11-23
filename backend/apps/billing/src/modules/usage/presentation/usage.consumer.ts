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

/** Colas `billing-usage` (lotes de uso de los servicios) y `billing-identity` (cambios de membresía). */
@Injectable()
export class UsageConsumer {
  constructor(
    private readonly usage: RecordUsage,
    private readonly membership: TrackMembership,
  ) {}

  @Subscribe(RecordUsageCommand)
  async onUsage(data: RecordUsagePayload): Promise<void> {
    await this.usage.execute(data);
  }

  @Subscribe(MembershipChangedEvent)
  onMembershipChanged(data: MembershipChangedPayload): Promise<void> {
    return this.membership.execute(data);
  }
}
