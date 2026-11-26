import { NotificationType, TemplateParameter } from '@contracts/notifications';
import type { UserRef } from '@contracts/platform';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import {
  InMemoryTransactionManager,
  RecordingMessageBus,
} from '@platform/messaging/test-utils';
import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { ChannelDeliverer } from '../../application/channel-deliverer.js';
import type { NotifyCommand } from '../../application/notify-command.js';
import { EraseUserDeliveries } from '../../application/erase-user-deliveries.use-case.js';
import { LocalDispatchFacade } from '../../application/local-dispatch.facade.js';
import { NotifyUser } from '../../application/notify-user.use-case.js';
import { RetryDeliveriesJob } from '../../application/retry-deliveries.job.js';
import { DeliveryStatus } from '../../domain/delivery.js';
import { FailedDeliveries } from '../../domain/failed-deliveries.js';
import type { Delivery } from '../../domain/delivery.js';
import {
  FixedPreferences,
  InMemoryDeliveries,
  InMemoryInbox,
  RecordingEmail,
  RecordingPush,
  RecordingRealtime,
  StaticRecipients,
} from './dispatch-fakes.js';

/** The pending or failed in-memory deliveries whose next attempt is due, as the job would see them. */
class InMemoryFailedDeliveries extends FailedDeliveries {
  constructor(private readonly deliveries: InMemoryDeliveries) {
    super();
  }

  override async due(now: Date, limit: number): Promise<readonly Delivery[]> {
    return this.deliveries
      .all()
      .filter(
        (d) =>
          (d.status === DeliveryStatus.Pending ||
            d.status === DeliveryStatus.Failed) &&
          d.nextAttemptAt <= now,
      )
      .sort((a, b) => a.nextAttemptAt.getTime() - b.nextAttemptAt.getTime())
      .slice(0, limit);
  }
}

/** `NotifyUser` and its retry job over fakes, with deterministic clock and ids. */
export class DispatchHarness {
  static readonly TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
  static readonly ANA: UserRef = {
    userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01',
    homeTenantId: DispatchHarness.TENANT,
  };

  readonly clock = new FixedClock(new Date('2026-11-20T15:00:00.000Z'));
  readonly preferences = new FixedPreferences();
  readonly inbox = new InMemoryInbox();
  readonly realtime = new RecordingRealtime();
  readonly deliveries = new InMemoryDeliveries();
  readonly recipients = new StaticRecipients().add({
    ref: DispatchHarness.ANA,
    email: 'ana@example.com',
    locale: 'es',
    displayName: 'Ana',
  });
  readonly email = new RecordingEmail();
  readonly push = new RecordingPush();
  readonly transactions = new InMemoryTransactionManager();
  readonly bus = new RecordingMessageBus(this.transactions);
  private readonly shard = UnroutedShardScopes.create();
  private readonly deliverer = new ChannelDeliverer(
    this.email,
    this.push,
    this.clock,
  );
  private readonly ids = new SequentialIdGenerator();

  readonly notifyUser = new NotifyUser(
    this.recipients,
    this.preferences,
    this.inbox,
    this.realtime,
    this.deliveries,
    this.deliverer,
    this.bus,
    this.shard,
    this.transactions,
    this.ids,
    this.clock,
  );
  readonly facade = new LocalDispatchFacade(
    this.notifyUser,
    new EraseUserDeliveries(this.deliveries, this.shard),
  );
  readonly retry = new RetryDeliveriesJob(
    new InMemoryFailedDeliveries(this.deliveries),
    this.recipients,
    this.deliverer,
    this.deliveries,
    this.shard,
    this.clock,
  );

  command(overrides: Partial<NotifyCommand> = {}): NotifyCommand {
    return {
      notificationId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d01',
      user: DispatchHarness.ANA,
      tenantId: DispatchHarness.TENANT,
      type: NotificationType.InvoiceIssued,
      parameters: new Map([[TemplateParameter.Reference, 'F-0042']]),
      ...overrides,
    };
  }
}
