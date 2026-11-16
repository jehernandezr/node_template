import {
  deliveredTypes,
  MessageKind,
  validateContract,
} from '@contracts/platform';
import { TasksEvent } from '@contracts/tasks';
import { BillingEvent, RecordUsageCommand } from '@contracts/billing';
import { reportsContract } from '../contract.js';
import { ReportRunStatus, ReportType } from '../enums/reports.enum.js';
import {
  ReportsCommand,
  ReportsEvent,
  ReportsQueue,
  NotificationsReference,
} from '../enums/identifiers.enum.js';
import { RunCompletedEvent } from '../events/reports.events.js';
import { ExecuteRunCommand } from '../events/reports.commands.js';
import { NotificationsEventsReference } from '../events/reports.references.js';
import { Ids, Now, UuidV4 } from './utils/fixtures.js';

const requester = { userId: Ids.user, homeTenantId: Ids.tenant };

describe('reports events and commands', () => {
  it('publishes only RunCompleted on the reports topic', () => {
    const types = reportsContract.topics.events.events.map((e) => e.type);
    expect(types).toEqual([ReportsEvent.RunCompleted]);
    expect(RunCompletedEvent.kind).toBe(MessageKind.Event);
  });

  it('receives ExecuteRun in the runs queue', () => {
    expect(reportsContract.queues.runs.name).toBe(ReportsQueue.Runs);
    expect(reportsContract.queues.runs.commands).toContain(ExecuteRunCommand);
    expect(ExecuteRunCommand.type).toBe(ReportsCommand.ExecuteRun);
  });

  it('delivers the three task events to the projections queue', () => {
    expect(reportsContract.queues.projections.name).toBe(
      ReportsQueue.Projections,
    );
    expect(deliveredTypes(reportsContract.queues.projections)).toEqual([
      TasksEvent.TaskCreated,
      TasksEvent.TaskUpdated,
      TasksEvent.TaskDeleted,
    ]);
  });

  it('delivers the invoice events and the notification created to the finance projections', () => {
    expect(reportsContract.queues.financeProjections.name).toBe(
      ReportsQueue.FinanceProjections,
    );
    expect(deliveredTypes(reportsContract.queues.financeProjections)).toEqual([
      BillingEvent.InvoiceIssued,
      BillingEvent.InvoicePaid,
      BillingEvent.InvoiceFailed,
      NotificationsReference.NotificationCreated,
    ]);
  });

  it('names the notifications topic and its created event by reference', () => {
    expect(NotificationsEventsReference.name).toBe(
      NotificationsReference.Topic,
    );
    expect(NotificationsEventsReference.events.map((e) => e.type)).toEqual([
      NotificationsReference.NotificationCreated,
    ]);
  });

  it('sends the run command to itself and the usage command to billing', () => {
    expect(reportsContract.sends).toContain(ExecuteRunCommand);
    expect(reportsContract.sends).toContain(RecordUsageCommand);
  });

  it('accepts a valid run completed payload', () => {
    const payload = {
      tenantId: Ids.tenant,
      runId: Ids.item,
      type: ReportType.TasksByStatus,
      status: ReportRunStatus.Ready,
      requestedBy: requester,
      completedAt: Now,
    };
    expect(validateContract(RunCompletedEvent.payload, payload).ok).toBe(true);
  });

  it.each([
    [
      'a run id that is not v7',
      {
        tenantId: Ids.tenant,
        runId: UuidV4,
        type: ReportType.TasksByStatus,
        status: ReportRunStatus.Ready,
        requestedBy: requester,
        completedAt: Now,
      },
    ],
    [
      'a missing requester',
      {
        tenantId: Ids.tenant,
        runId: Ids.item,
        type: ReportType.TasksByStatus,
        status: ReportRunStatus.Ready,
        completedAt: Now,
      },
    ],
  ])('rejects a run completed payload with %s', (_name, payload) => {
    expect(validateContract(RunCompletedEvent.payload, payload).ok).toBe(false);
  });

  it('accepts a valid execute run payload', () => {
    expect(
      validateContract(ExecuteRunCommand.payload, {
        tenantId: Ids.tenant,
        runId: Ids.item,
      }).ok,
    ).toBe(true);
  });

  it('rejects an execute run payload that carries the requester', () => {
    expect(
      validateContract(ExecuteRunCommand.payload, {
        tenantId: Ids.tenant,
        runId: Ids.item,
        requestedBy: requester,
      }).ok,
    ).toBe(false);
    expect(
      validateContract(ExecuteRunCommand.payload, {
        tenantId: UuidV4,
        runId: Ids.item,
      }).ok,
    ).toBe(false);
  });
});
