import {
  AccessKind,
  HttpMethod,
  QueryParamsCodec,
  validateContract,
} from '@contracts/platform';
import { Permission, SessionGuardErrors } from '@contracts/identity';
import { TaskStatus } from '../enums/tasks.enum.js';
import { TasksErrorCode } from '../enums/identifiers.enum.js';
import {
  CreateTaskRoute,
  DeleteTaskRoute,
  GetTaskRoute,
  ListTasksRoute,
  UpdateTaskRoute,
} from '../http/task.routes.js';
import {
  CreateTaskRequestSchema,
  TaskSchema,
  UpdateTaskRequestSchema,
} from '../schemas/task.schema.js';
import { Ids, Now, UuidV4 } from './utils/fixtures.js';

const validTask = {
  id: Ids.item,
  title: 'Preparar informe',
  description: '',
  status: TaskStatus.Open,
  version: 1,
  createdAt: Now,
  updatedAt: Now,
  createdBy: { userId: Ids.user, homeTenantId: Ids.tenant },
};

describe('tasks routes', () => {
  it.each([
    [ListTasksRoute, HttpMethod.Get, '/v1/tasks', 200, [Permission.TasksRead]],
    [
      GetTaskRoute,
      HttpMethod.Get,
      '/v1/tasks/{taskId}',
      200,
      [Permission.TasksRead],
    ],
    [
      CreateTaskRoute,
      HttpMethod.Post,
      '/v1/tasks',
      201,
      [Permission.TasksWrite],
    ],
    [
      UpdateTaskRoute,
      HttpMethod.Patch,
      '/v1/tasks/{taskId}',
      200,
      [Permission.TasksWrite],
    ],
    [
      DeleteTaskRoute,
      HttpMethod.Delete,
      '/v1/tasks/{taskId}',
      204,
      [Permission.TasksWrite],
    ],
  ])(
    'serves %s as %s %s with status %i',
    (route, method, path, successStatus, permissions) => {
      expect(route.method).toBe(method);
      expect(route.path).toBe(path);
      expect(route.successStatus).toBe(successStatus);
      expect(route.access.kind).toBe(AccessKind.Authenticated);
      expect(route.access.permissions).toEqual(permissions);
      for (const code of SessionGuardErrors) {
        expect(route.errors).toContain(code);
      }
    },
  );

  it('answers 204 without body on delete', () => {
    expect(DeleteTaskRoute.response).toBeNull();
    expect(DeleteTaskRoute.pathParams).toEqual(['taskId']);
  });

  it('takes the task id from the path on get, update and delete', () => {
    expect(GetTaskRoute.pathParams).toEqual(['taskId']);
    expect(UpdateTaskRoute.pathParams).toEqual(['taskId']);
    expect(DeleteTaskRoute.pathParams).toEqual(['taskId']);
  });

  it('declares the conflict and the not-found codes on update', () => {
    expect(UpdateTaskRoute.errors).toContain(TasksErrorCode.TaskNotFound);
    expect(UpdateTaskRoute.errors).toContain(
      TasksErrorCode.TaskVersionConflict,
    );
  });

  it('declares the short search code on list', () => {
    expect(ListTasksRoute.errors).toContain(TasksErrorCode.SearchQueryTooShort);
  });

  it('exposes the list filters as query parameters', () => {
    expect(ListTasksRoute.queryParams.map((p) => p.name)).toEqual([
      'status',
      'q',
      'limit',
      'after',
    ]);
    const decoded = new QueryParamsCodec().decode(ListTasksRoute, {
      status: TaskStatus.Open,
      q: 'x',
      limit: '20',
    });
    const result = validateContract(ListTasksRoute.request, decoded);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.limit).toBe(20);
    }
  });

  it('accepts a valid creation and rejects the invalid ones', () => {
    expect(validateContract(CreateTaskRequestSchema, { title: 't' }).ok).toBe(
      true,
    );
    expect(validateContract(CreateTaskRequestSchema, { title: '' }).ok).toBe(
      false,
    );
    expect(
      validateContract(CreateTaskRequestSchema, { title: 'a'.repeat(201) }).ok,
    ).toBe(false);
    expect(
      validateContract(CreateTaskRequestSchema, {
        title: 't',
        description: 'd'.repeat(5001),
      }).ok,
    ).toBe(false);
    expect(
      validateContract(CreateTaskRequestSchema, { title: 't', extra: true }).ok,
    ).toBe(false);
  });

  it('rejects an expected version below one and a non v7 id on update', () => {
    expect(
      validateContract(UpdateTaskRequestSchema, {
        taskId: Ids.item,
        expectedVersion: 0,
      }).ok,
    ).toBe(false);
    expect(
      validateContract(UpdateTaskRequestSchema, {
        taskId: UuidV4,
        title: 't',
      }).ok,
    ).toBe(false);
    expect(
      validateContract(UpdateTaskRequestSchema, {
        taskId: Ids.item,
        status: TaskStatus.Done,
      }).ok,
    ).toBe(true);
  });

  it('validates a complete task and rejects an unknown status', () => {
    expect(validateContract(TaskSchema, validTask).ok).toBe(true);
    expect(
      validateContract(TaskSchema, { ...validTask, status: 'nope' }).ok,
    ).toBe(false);
  });
});
