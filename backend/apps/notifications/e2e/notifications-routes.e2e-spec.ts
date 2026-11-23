import {
  NotificationFrameType,
  notificationsContract,
  NotificationsErrorCode,
  NotificationsRoute,
  NotificationType,
  NotifyUserOperation,
  TemplateParameter,
} from '@contracts/notifications';
import type { RouteDefinition } from '@contracts/platform';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { Eventually } from '@platform/messaging/test-utils';
import { SocketTestClient } from '@platform/realtime/test-utils';
import { NotificationsStreamEndpoints } from '../src/modules/realtime/presentation/notifications-realtime.module.js';
import { NotificationsTestApp } from '../src/__tests__/utils/index.js';

const ANA = {
  userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b11',
  tenantId: NotificationsTestApp.TENANT_A,
};
const BEA = {
  userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b12',
  tenantId: NotificationsTestApp.TENANT_B,
};
const ROUTES: readonly RouteDefinition[] = Object.values(
  notificationsContract.routes,
);
const UNKNOWN_NOTIFICATION = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d99';

/** Un cuerpo válido por ruta, así la respuesta depende solo del acceso. */
const BODIES: Partial<Record<string, unknown>> = {
  [NotificationsRoute.SavePreferences]: {
    enabled: [],
    quietStart: '00:00',
    quietEnd: '00:00',
    timezone: 'UTC',
  },
};

interface InboxPage {
  readonly items: ReadonlyArray<{ readonly id: string }>;
}

new ContainerRuntime(process.env).describeIfAvailable(
  'notifications routes end to end',
  () => {
    jest.setTimeout(300_000);
    const app = new NotificationsTestApp();
    let sequence = 0;

    beforeAll(async () => {
      await app.start();
    });

    afterAll(async () => {
      await app.stop();
    });

    const notify = async (member: typeof ANA): Promise<string> => {
      sequence += 1;
      const notificationId = `0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d${String(sequence).padStart(2, '0')}`;
      await app.internal().invoke(NotifyUserOperation, {
        notificationId,
        user: { userId: member.userId, homeTenantId: member.tenantId },
        tenantId: member.tenantId,
        type: NotificationType.TaskUpdated,
        parameters: [{ name: TemplateParameter.Reference, value: 'T-1' }],
      });
      return notificationId;
    };

    const pathOf = (route: RouteDefinition, notificationId: string) =>
      route.path.replace('{notificationId}', notificationId);

    describe('access matrix', () => {
      it.each(ROUTES.map((route) => [route.id, route] as const))(
        '%s answers 401 without a token',
        async (_id, route) => {
          const response = await app
            .anonymous()
            .send(route.method, pathOf(route, UNKNOWN_NOTIFICATION), {
              body: BODIES[route.id],
            });

          expect(response.status).toBe(401);
        },
      );

      it.each(ROUTES.map((route) => [route.id, route] as const))(
        '%s lets in any signed in user',
        async (_id, route) => {
          const client = await app.clientOf(ANA);
          const notificationId = await notify(ANA);

          const response = await client.send(
            route.method,
            pathOf(route, notificationId),
            { body: BODIES[route.id] },
          );

          expect(response.status).toBeLessThan(300);
        },
      );

      it('answers 401 to the event stream without a token', async () => {
        const response = await fetch(
          `${app.baseUrl()}${NotificationsStreamEndpoints.ssePath}`,
        );

        expect(response.status).toBe(401);
      });
    });

    it('does not let a user mark the notification of someone else as read', async () => {
      const ofAna = await notify(ANA);
      const bea = await app.clientOf(BEA);

      const response = await bea.post(`/v1/notifications/${ofAna}/read`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        code: NotificationsErrorCode.InboxNotFound,
      });
    });

    it('marks every notification read and lists them newest first', async () => {
      const bea = await app.clientOf(BEA);
      const older = await notify(BEA);
      const newer = await notify(BEA);

      const listed = await bea.get('/v1/notifications');
      const readAll = await bea.post('/v1/notifications/read-all');
      const unread = await bea.get('/v1/notifications/unread-count');

      expect(
        (listed.body as InboxPage).items.map((item) => item.id).slice(0, 2),
      ).toEqual([newer, older]);
      expect(readAll.status).toBeLessThan(300);
      expect(unread.body).toEqual({ count: 0 });
    });

    it('delivers a new notification over Socket.IO and refuses a socket without a token', async () => {
      const url = `${app.baseUrl()}${NotificationsStreamEndpoints.socketNamespace}`;
      const connected = new SocketTestClient();
      const anonymous = new SocketTestClient();
      await connected.open(url, await app.tokenOf(ANA));
      await anonymous.open(url, '');

      await notify(ANA);
      await Eventually.until(
        () =>
          connected.frames.some(
            (frame) => frame.type === NotificationFrameType.Notification,
          ),
        10_000,
      );
      connected.close();

      expect(anonymous.connectError).toBeDefined();
    });
  },
);
