import {
  CreateTaskRoute,
  DeleteTaskRoute,
  GetTaskRoute,
  ListTasksRoute,
  TaskStatus,
} from '@contracts/tasks';
import { ContractClient } from '../contract-client.js';
import { LocalApi } from './utils/index.js';

describe('ContractClient', () => {
  const TASK_ID = '018f0000-0000-7000-8000-000000000001';
  const task = {
    id: TASK_ID,
    title: 'Smoke',
    description: '',
    status: TaskStatus.Open,
    version: 1,
    createdAt: '2026-11-26T00:00:00.000Z',
    updatedAt: '2026-11-26T00:00:00.000Z',
    createdBy: {
      userId: '018f0000-0000-7000-8000-000000000002',
      homeTenantId: '018f0000-0000-7000-8000-000000000003',
    },
  };
  const api = new LocalApi((_, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(task));
  });
  let client: ContractClient;

  beforeAll(async () => {
    client = new ContractClient(new URL('/api', await api.start()));
  });

  afterAll(() => api.stop());

  it('puts path parameters in the path, under the prefix of the base URL, as the native app', async () => {
    const read = await client.call(GetTaskRoute, { taskId: TASK_ID }, 'access');
    const request = api.received.at(-1);

    expect(read).toEqual(task);
    expect(request).toMatchObject({
      method: 'GET',
      url: `/api/v1/tasks/${TASK_ID}`,
      body: '',
    });
    expect(request?.headers).toMatchObject({
      authorization: 'Bearer access',
      'x-session-transport': 'bearer',
    });
  });

  it('sends the other fields of a read in the query', async () => {
    api.answer((_, response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ items: [task], nextCursor: 'end' }));
    });

    await client.call(ListTasksRoute, { status: TaskStatus.Open, limit: 5 });

    expect(api.received.at(-1)?.url).toBe('/api/v1/tasks?status=open&limit=5');
    expect(api.received.at(-1)?.headers.authorization).toBeUndefined();
  });

  it('sends a write as a JSON body and requires its success status', async () => {
    api.answer((_, response) => {
      response.writeHead(201, { 'content-type': 'application/json' });
      response.end(JSON.stringify(task));
    });

    await expect(
      client.call(CreateTaskRoute, { title: 'Smoke' }, 'access'),
    ).resolves.toEqual(task);
    expect(JSON.parse(api.received.at(-1)?.body ?? '')).toEqual({
      title: 'Smoke',
    });
  });

  it('answers nothing for a route without a body', async () => {
    api.answer((_, response) => {
      response.writeHead(204);
      response.end();
    });

    await expect(
      client.call(DeleteTaskRoute, { taskId: TASK_ID }, 'access'),
    ).resolves.toBeUndefined();
  });

  it('fails with the status and text of an unexpected answer', async () => {
    api.answer((_, response) => {
      response.writeHead(401, { 'content-type': 'application/problem+json' });
      response.end('{"code":"PLATFORM.AUTH.UNAUTHENTICATED"}');
    });

    await expect(
      client.call(GetTaskRoute, { taskId: TASK_ID }),
    ).rejects.toThrow(
      'GET /v1/tasks/{taskId} answered 401: {"code":"PLATFORM.AUTH.UNAUTHENTICATED"}',
    );
  });

  it('rejects a request the contract refuses before sending it', async () => {
    const sent = api.received.length;

    await expect(client.call(CreateTaskRoute, { title: '' })).rejects.toThrow();
    expect(api.received).toHaveLength(sent);
  });
});
