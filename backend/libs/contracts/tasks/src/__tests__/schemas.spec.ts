import { validateContract } from '@contracts/platform';
import { TasksLimits } from '../constants/tasks.constants.js';
import { TaskStatus } from '../enums/tasks.enum.js';
import {
  ListTasksRequestSchema,
  ListTaskChangesInputSchema,
  TaskChangePageSchema,
  TaskChangeSchema,
  TaskPageSchema,
  TaskSchema,
} from '../schemas/task.schema.js';
import { Ids, Now } from './utils/fixtures.js';

const author = { userId: Ids.user, homeTenantId: Ids.tenant };

const task = {
  id: Ids.item,
  title: 'Preparar informe',
  description: 'Detalle',
  status: TaskStatus.InProgress,
  version: 1,
  createdAt: Now,
  updatedAt: Now,
  createdBy: author,
};

describe('tasks schemas', () => {
  it('enforces the title limit', () => {
    expect(
      validateContract(TaskSchema, {
        ...task,
        title: 'a'.repeat(TasksLimits.titleMax),
      }).ok,
    ).toBe(true);
    expect(
      validateContract(TaskSchema, {
        ...task,
        title: 'a'.repeat(TasksLimits.titleMax + 1),
      }).ok,
    ).toBe(false);
  });

  it('enforces the description limit', () => {
    expect(
      validateContract(TaskSchema, {
        ...task,
        description: 'd'.repeat(TasksLimits.descriptionMax + 1),
      }).ok,
    ).toBe(false);
  });

  it('makes the search text optional and bounded', () => {
    expect(validateContract(ListTasksRequestSchema, {}).ok).toBe(true);
    expect(
      validateContract(ListTasksRequestSchema, {
        q: 'a'.repeat(TasksLimits.searchQueryMax),
      }).ok,
    ).toBe(true);
    expect(
      validateContract(ListTasksRequestSchema, {
        q: 'a'.repeat(TasksLimits.searchQueryMax + 1),
      }).ok,
    ).toBe(false);
  });

  it('requires both user id and home tenant in a user reference', () => {
    expect(
      validateContract(TaskSchema, { ...task, createdBy: { userId: Ids.user } })
        .ok,
    ).toBe(false);
    expect(
      validateContract(TaskSchema, {
        ...task,
        createdBy: { homeTenantId: Ids.tenant },
      }).ok,
    ).toBe(false);
  });

  it('requires deletedAt in a change: null or an instant', () => {
    expect(
      validateContract(TaskChangeSchema, { ...task, deletedAt: null }).ok,
    ).toBe(true);
    expect(
      validateContract(TaskChangeSchema, { ...task, deletedAt: Now }).ok,
    ).toBe(true);
    expect(validateContract(TaskChangeSchema, task).ok).toBe(false);
  });

  it('rejects pages with more than one hundred items', () => {
    const items = Array.from({ length: 101 }, () => task);
    expect(
      validateContract(TaskPageSchema, { items, nextCursor: null }).ok,
    ).toBe(false);
    expect(
      validateContract(TaskChangePageSchema, {
        items: items.map((item) => ({ ...item, deletedAt: null })),
        nextCursor: null,
      }).ok,
    ).toBe(false);
  });

  it('bounds the page size of the change listing', () => {
    expect(
      validateContract(ListTaskChangesInputSchema, {
        tenantId: Ids.tenant,
        limit: 101,
      }).ok,
    ).toBe(false);
  });
});
