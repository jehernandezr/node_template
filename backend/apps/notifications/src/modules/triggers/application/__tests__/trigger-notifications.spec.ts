import { MembershipChangeKind } from '@contracts/identity';
import { ReportRunStatus, ReportType } from '@contracts/reports';
import { NotificationType, TemplateParameter } from '@contracts/notifications';
import { TaskField, TaskStatus } from '@contracts/tasks';
import type { UserRef } from '@contracts/platform';
import { DispatchFacade, type NotifyCommand } from '../../../dispatch/index.js';
import { StaticRecipients } from '../../../dispatch/__tests__/utils/index.js';
import { NotificationIds } from '../notification-ids.js';
import { TenantMembers } from '../tenant-members.js';
import { TriggerNotifications } from '../trigger-notifications.js';

const TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
const MESSAGE = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9e01';
const ANA: UserRef = {
  userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01',
  homeTenantId: TENANT,
};
const BEA: UserRef = {
  userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b02',
  homeTenantId: TENANT,
};

class RecordingDispatch extends DispatchFacade {
  readonly commands: NotifyCommand[] = [];

  override async notify(command: NotifyCommand) {
    this.commands.push(command);
    return [];
  }

  override async eraseUser(): Promise<number> {
    return 0;
  }
}

class FixedMembers extends TenantMembers {
  constructor(private readonly members: readonly UserRef[]) {
    super();
  }

  override async withPermission(): Promise<readonly UserRef[]> {
    return this.members;
  }
}

const setup = () => {
  const dispatch = new RecordingDispatch();
  const triggers = new TriggerNotifications(
    dispatch,
    new StaticRecipients().add({
      ref: ANA,
      email: 'ana@example.com',
      locale: 'es',
      displayName: 'Ana',
    }),
    new FixedMembers([ANA, BEA]),
  );
  return { dispatch, triggers };
};

const taskUpdated = (actor: UserRef) => ({
  tenantId: TENANT,
  taskId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9c01',
  changedFields: [TaskField.Status],
  statusBefore: TaskStatus.Open,
  statusAfter: TaskStatus.Done,
  version: 2,
  actor,
  createdBy: ANA,
  updatedAt: '2026-11-20T10:00:00.000Z',
});

describe('TriggerNotifications', () => {
  it('tells the author when someone else changed the task', async () => {
    const { dispatch, triggers } = setup();

    await triggers.taskUpdated(MESSAGE, taskUpdated(BEA));

    expect(dispatch.commands).toEqual([
      expect.objectContaining({
        user: ANA,
        type: NotificationType.TaskUpdated,
      }),
    ]);
  });

  it('says nothing when the author changed the task', async () => {
    const { dispatch, triggers } = setup();

    await triggers.taskUpdated(MESSAGE, taskUpdated(ANA));

    expect(dispatch.commands).toEqual([]);
  });

  it('tells every billing member about an issued invoice with its number', async () => {
    const { dispatch, triggers } = setup();

    await triggers.invoiceIssued(MESSAGE, {
      tenantId: TENANT,
      invoiceId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f11',
      number: 'F-0042',
      period: { start: '2026-11-01', end: '2026-11-30' },
      total: { amountMinor: 100_000, currency: 'COP' },
      issuedAt: '2026-11-20T10:00:00.000Z',
    });

    expect(dispatch.commands.map((command) => command.user)).toEqual([
      ANA,
      BEA,
    ]);
    expect(
      dispatch.commands[0]?.parameters.get(TemplateParameter.Reference),
    ).toBe('F-0042');
  });
});

describe('TriggerNotifications account activity', () => {
  it('tells the member whose membership changed', async () => {
    const { dispatch, triggers } = setup();

    await triggers.membershipChanged(MESSAGE, {
      tenantId: TENANT,
      userId: ANA.userId,
      kind: MembershipChangeKind.Added,
      groupIds: [],
      changedAt: '2026-11-20T10:00:00.000Z',
    });

    expect(dispatch.commands).toEqual([
      expect.objectContaining({
        user: ANA,
        type: NotificationType.AccountActivity,
      }),
    ]);
  });

  it('tells whoever asked for a report that it finished', async () => {
    const { dispatch, triggers } = setup();

    await triggers.reportCompleted(MESSAGE, {
      tenantId: TENANT,
      runId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f13',
      type: ReportType.TasksByStatus,
      status: ReportRunStatus.Ready,
      requestedBy: BEA,
      completedAt: '2026-11-20T10:00:00.000Z',
    });

    expect(dispatch.commands).toEqual([
      expect.objectContaining({
        user: BEA,
        type: NotificationType.AccountActivity,
      }),
    ]);
  });

  it('says nothing about a user identity no longer knows', async () => {
    const { dispatch, triggers } = setup();

    await triggers.membershipChanged(MESSAGE, {
      tenantId: TENANT,
      userId: BEA.userId,
      kind: MembershipChangeKind.Added,
      groupIds: [],
      changedAt: '2026-11-20T10:00:00.000Z',
    });

    expect(dispatch.commands).toEqual([]);
  });
});

describe('NotificationIds', () => {
  it('derives the same UUIDv7 for the same message and recipient', () => {
    const id = NotificationIds.derive(MESSAGE, ANA.userId);

    expect(id).toBe(NotificationIds.derive(MESSAGE, ANA.userId));
    expect(id).toMatch(
      /^0192f1b4-7c3a-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('derives different ids for different recipients of the same message', () => {
    expect(NotificationIds.derive(MESSAGE, ANA.userId)).not.toBe(
      NotificationIds.derive(MESSAGE, BEA.userId),
    );
  });
});
