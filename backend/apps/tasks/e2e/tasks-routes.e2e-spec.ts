import { Permission } from '@contracts/identity';
import { PlatformErrorCode, type RouteDefinition } from '@contracts/platform';
import {
  TaskStatus,
  tasksContract,
  TasksErrorCode,
  TasksRoute,
} from '@contracts/tasks';
import type { HttpTestClient } from '@platform/http/test-utils';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { TasksTestApp } from '../src/__tests__/utils/index.js';

const ANA = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01';
const OUTSIDER = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b07';
/** Un miembro por ruta: el servicio guarda el acceso por versión de permisos y no lo vuelve a pedir. */
const exactAccessMember = (index: number) =>
  `0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9c${String(index).padStart(2, '0')}`;
const ROUTES: readonly RouteDefinition[] = Object.values(tasksContract.routes);
const TENANT = TasksTestApp.TENANT_A;

interface TaskBody {
  readonly id: string;
  readonly title: string;
  readonly status: TaskStatus;
  readonly version: number;
}

interface TaskPage {
  readonly items: readonly TaskBody[];
}

/** Un cuerpo válido por ruta, así la respuesta depende solo del acceso. */
const BODIES: Partial<Record<string, unknown>> = {
  [TasksRoute.CreateTask]: { title: 'Revisar el acceso' },
  [TasksRoute.UpdateTask]: { title: 'Acceso revisado' },
};

new ContainerRuntime(process.env).describeIfAvailable(
  'tasks routes end to end',
  () => {
    jest.setTimeout(300_000);
    const app = new TasksTestApp();
    let ana: HttpTestClient;

    beforeAll(async () => {
      await app.start();
      ana = await app.clientOf({ userId: ANA, tenantId: TENANT });
    });

    afterAll(async () => {
      await app.stop();
    });

    const create = async (title: string): Promise<TaskBody> => {
      const response = await ana.post('/v1/tasks', { body: { title } });
      expect(response.status).toBe(201);
      return response.body as TaskBody;
    };

    const call = async (client: HttpTestClient, route: RouteDefinition) => {
      const task = await create(`Para ${route.id}`);
      return client.send(
        route.method,
        route.path.replace('{taskId}', task.id),
        { body: BODIES[route.id] },
      );
    };

    describe('access matrix', () => {
      it.each(ROUTES.map((route) => [route.id, route] as const))(
        '%s answers 401 without a token',
        async (_id, route) => {
          const response = await call(app.anonymous(), route);

          expect(response.status).toBe(401);
        },
      );

      it.each(ROUTES.map((route) => [route.id, route] as const))(
        '%s answers 403 to a member without its permission',
        async (_id, route) => {
          const member = await app.clientOf({
            userId: OUTSIDER,
            tenantId: TENANT,
            permissions: [],
          });

          const response = await call(member, route);

          expect(response.status).toBe(403);
          expect(response.body).toMatchObject({
            code: PlatformErrorCode.AuthForbidden,
          });
        },
      );

      it.each(ROUTES.map((route, index) => [route.id, route, index] as const))(
        '%s lets in a member with exactly its permissions',
        async (_id, route, index) => {
          const member = await app.clientOf({
            userId: exactAccessMember(index),
            tenantId: TENANT,
            permissions: Object.values(Permission).filter((permission) =>
              (route.access.permissions ?? []).includes(permission),
            ),
          });

          const response = await call(member, route);

          expect(response.status).toBeLessThan(300);
        },
      );
    });

    it('creates, reads, lists, changes and deletes a task', async () => {
      const created = await create('Preparar la reunión');

      const read = await ana.get(`/v1/tasks/${created.id}`);
      const listed = await ana.get('/v1/tasks');
      const changed = await ana.patch(`/v1/tasks/${created.id}`, {
        body: { status: TaskStatus.Done, expectedVersion: created.version },
      });
      const deleted = await ana.delete(`/v1/tasks/${created.id}`);
      const afterDelete = await ana.get(`/v1/tasks/${created.id}`);

      expect(read.body).toMatchObject({
        id: created.id,
        title: 'Preparar la reunión',
        status: TaskStatus.Open,
      });
      expect((listed.body as TaskPage).items.map((task) => task.id)).toContain(
        created.id,
      );
      expect(changed.body).toMatchObject({
        status: TaskStatus.Done,
        version: created.version + 1,
      });
      expect(deleted.status).toBe(204);
      expect(afterDelete.status).toBe(404);
      expect(afterDelete.body).toMatchObject({
        code: TasksErrorCode.TaskNotFound,
      });
    });

    it('finds a task by the stem of a Spanish word', async () => {
      const task = await create('Pagar las facturas pendientes');

      const found = await ana.get('/v1/tasks?q=factura%20pendiente');

      expect(found.status).toBe(200);
      expect((found.body as TaskPage).items.map((item) => item.id)).toContain(
        task.id,
      );
    });

    it('rejects with 409 a change based on an old version', async () => {
      const task = await create('Cerrar el mes');
      await ana.patch(`/v1/tasks/${task.id}`, {
        body: {
          title: 'Cerrar el mes de marzo',
          expectedVersion: task.version,
        },
      });

      const stale = await ana.patch(`/v1/tasks/${task.id}`, {
        body: { title: 'Otro', expectedVersion: task.version },
      });

      expect(stale.status).toBe(409);
      expect(stale.body).toMatchObject({
        code: TasksErrorCode.TaskVersionConflict,
      });
    });

    it('answers 400 to a task without a title', async () => {
      const response = await ana.post('/v1/tasks', { body: { title: '' } });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        code: PlatformErrorCode.ValidationInvalidInput,
      });
    });
  },
);
