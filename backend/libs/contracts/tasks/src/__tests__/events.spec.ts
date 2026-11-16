import { MessageKind, validateContract } from '@contracts/platform';
import { RecordUsageCommand } from '@contracts/billing';
import { tasksContract } from '../contract.js';
import { TaskField, TaskStatus } from '../enums/tasks.enum.js';
import { TasksEvent } from '../enums/identifiers.enum.js';
import {
  TaskCreatedEvent,
  TaskDeletedEvent,
  TasksEventsTopic,
  TaskUpdatedEvent,
} from '../events/index.js';
import {
  TaskCreatedPayloadSchema,
  TaskUpdatedPayloadSchema,
} from '../schemas/event.schema.js';
import { Ids, Now } from './utils/fixtures.js';

const events = Object.values(tasksContract.events);

const actor = { userId: Ids.user, homeTenantId: Ids.tenant };
const owner = { userId: Ids.other, homeTenantId: Ids.tenant };

const updatedPayload = {
  tenantId: Ids.tenant,
  taskId: Ids.item,
  changedFields: [TaskField.Title, TaskField.Status],
  statusBefore: TaskStatus.Open,
  statusAfter: TaskStatus.Done,
  version: 2,
  actor,
  createdBy: owner,
  updatedAt: Now,
};

describe('tasks events', () => {
  it('publishes exactly the three task events on the tasks topic', () => {
    expect(TasksEventsTopic.events.map((event) => event.type).sort()).toEqual(
      [
        TasksEvent.TaskCreated,
        TasksEvent.TaskUpdated,
        TasksEvent.TaskDeleted,
      ].sort(),
    );
    expect(tasksContract.topics.events).toBe(TasksEventsTopic);
  });

  it.each(events.map((event) => [event.type, event] as const))(
    'versions %s as an event',
    (type, event) => {
      expect(event.kind).toBe(MessageKind.Event);
      expect(type).toMatch(/\.v1$/);
    },
  );

  it('accepts a valid update with two changed fields', () => {
    expect(validateContract(TaskUpdatedPayloadSchema, updatedPayload).ok).toBe(
      true,
    );
    expect(TaskUpdatedEvent.payload).toBe(TaskUpdatedPayloadSchema);
  });

  it('rejects an update with four changed fields or without actor', () => {
    expect(
      validateContract(TaskUpdatedPayloadSchema, {
        ...updatedPayload,
        changedFields: [
          TaskField.Title,
          TaskField.Description,
          TaskField.Status,
          TaskField.Title,
        ],
      }).ok,
    ).toBe(false);
    expect(
      validateContract(TaskUpdatedPayloadSchema, {
        ...updatedPayload,
        actor: undefined,
      }).ok,
    ).toBe(false);
  });

  it('accepts creation and deletion payloads and rejects a malformed createdBy', () => {
    const created = {
      tenantId: Ids.tenant,
      taskId: Ids.item,
      status: TaskStatus.Open,
      version: 1,
      createdBy: owner,
      createdAt: Now,
    };
    const deleted = {
      tenantId: Ids.tenant,
      taskId: Ids.item,
      status: TaskStatus.Done,
      version: 3,
      actor,
      deletedAt: Now,
    };
    expect(validateContract(TaskCreatedPayloadSchema, created).ok).toBe(true);
    expect(validateContract(TaskCreatedEvent.payload, deleted).ok).toBe(false);
    expect(
      validateContract(TaskCreatedPayloadSchema, {
        ...created,
        createdBy: { userId: Ids.user },
      }).ok,
    ).toBe(false);
    expect(validateContract(TaskDeletedEvent.payload, deleted).ok).toBe(true);
    expect(
      validateContract(TaskDeletedEvent.payload, {
        ...deleted,
        actor: { homeTenantId: Ids.tenant },
      }).ok,
    ).toBe(false);
  });

  it('sends the usage record command to billing', () => {
    expect(tasksContract.sends).toContain(RecordUsageCommand);
  });
});
