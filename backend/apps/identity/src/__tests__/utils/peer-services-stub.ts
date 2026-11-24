import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  BillingErrorCode,
  CheckQuotaOperation,
  CloseAccountOperation,
  OpenAccountOperation,
  SubscriptionStatus,
  type UsageMetric,
} from '@contracts/billing';
import {
  EraseNotificationsUserDataOperation,
  NotificationChannel,
  NotifyUserOperation,
} from '@contracts/notifications';
import { EraseReportsUserDataOperation } from '@contracts/reports';
import { EraseTasksUserDataOperation } from '@contracts/tasks';
import { InternalApiRoute } from '@platform/internal-api';
import { CallOutcome } from '@platform/primitives';

/** Lo que el plan de un tenant permite de una métrica y lo que ya usó. */
export interface StubQuota {
  readonly limit: number;
  readonly used: number;
}

type Input = Record<string, unknown> & {
  tenantId?: string;
  metric?: UsageMetric;
  notificationId?: string;
  user?: { userId: string };
};

/**
 * Billing, notifications, tasks y reports de mentira para identity: responden los pasos de las sagas y las
 * consultas de cuota, y anotan cada operación que reciben. Un tenant sin cuota fijada no tiene suscripción.
 */
export class PeerServicesStub {
  readonly received: string[] = [];
  private readonly refused = new Set<string>();
  private readonly quotas = new Map<string, StubQuota>();
  private readonly unlimitedChecks = new Map<string, number>();
  private readonly server: Server = createServer((request, response) => {
    this.answer(request, response).catch((error: unknown) => {
      if (!response.headersSent) {
        response.writeHead(500);
      }
      response.end(String(error));
    });
  });

  async start(): Promise<void> {
    await new Promise<void>((resolve) =>
      this.server.listen(0, '127.0.0.1', resolve),
    );
  }

  async stop(): Promise<void> {
    this.server.closeAllConnections();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  /** Las URLs de los cuatro servicios, todas hacia este stub. */
  baseUrls(): Record<string, string> {
    const { port } = this.server.address() as AddressInfo;
    const url = `http://127.0.0.1:${port}`;
    return { billing: url, notifications: url, tasks: url, reports: url };
  }

  /** Billing rechaza la cuenta de los tenants que cree este usuario. */
  refuseAccountsOf(ownerUserId: string): void {
    this.refused.add(ownerUserId);
  }

  /** Fija la cuota de una métrica del tenant, como si tuviera una suscripción con ese plan. */
  limit(tenantId: string, metric: UsageMetric, quota: StubQuota): void {
    this.quotas.set(`${tenantId}:${metric}`, quota);
  }

  /**
   * Las primeras `checks` consultas de la métrica responden que el tenant no tiene suscripción, sin límite, y las
   * siguientes con `quota`: así otro miembro toma el último cupo entre dos revisiones. Una respuesta sin
   * suscripción no queda en el caché de cuotas del servicio, así que la segunda revisión llega aquí.
   */
  fillAfter(
    tenantId: string,
    metric: UsageMetric,
    quota: StubQuota,
    checks: number,
  ): void {
    this.limit(tenantId, metric, quota);
    this.unlimitedChecks.set(`${tenantId}:${metric}`, checks);
  }

  private async answer(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(chunk as Buffer);
    }
    const { input } = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
      input: Input;
    };
    const operationId = decodeURIComponent(
      (request.url ?? '').split('/').at(-1) ?? '',
    );
    this.received.push(operationId);
    response
      .writeHead(200, { 'content-type': 'application/json' })
      .end(
        JSON.stringify({ outcome: this.outcomeOf(request.url ?? '', input) }),
      );
  }

  private outcomeOf(path: string, input: Input): unknown {
    const tenantId = String(input.tenantId);
    switch (path) {
      case InternalApiRoute.pathOf(OpenAccountOperation.id):
        return this.refused.has(String(input['ownerUserId']))
          ? CallOutcome.businessError(BillingErrorCode.PlanNotAvailable)
          : CallOutcome.success({
              tenantId,
              subscriptionId: tenantId,
              status: SubscriptionStatus.Trialing,
            });
      case InternalApiRoute.pathOf(CheckQuotaOperation.id):
        return this.quotaOf(tenantId, input);
      case InternalApiRoute.pathOf(CloseAccountOperation.id):
        return CallOutcome.success({ tenantId });
      case InternalApiRoute.pathOf(NotifyUserOperation.id):
        return CallOutcome.success({
          notificationId: input.notificationId,
          channels: [NotificationChannel.InApp],
        });
      case InternalApiRoute.pathOf(EraseTasksUserDataOperation.id):
      case InternalApiRoute.pathOf(EraseNotificationsUserDataOperation.id):
      case InternalApiRoute.pathOf(EraseReportsUserDataOperation.id):
        return CallOutcome.success({
          userId: input.user?.userId,
          affectedRows: 0,
        });
      default:
        return CallOutcome.protocolViolation(`unexpected ${path}`);
    }
  }

  private quotaOf(tenantId: string, input: Input): unknown {
    const key = `${tenantId}:${String(input.metric)}`;
    const quota = this.quotas.get(key);
    const unlimited = this.unlimitedChecks.get(key) ?? 0;
    if (unlimited > 0) {
      this.unlimitedChecks.set(key, unlimited - 1);
    }
    if (quota === undefined || unlimited > 0) {
      return CallOutcome.businessError(BillingErrorCode.SubscriptionNotFound);
    }
    const requested = Number(input['requested'] ?? 1);
    return CallOutcome.success({
      metric: input.metric,
      ...quota,
      allowed: quota.used + requested <= quota.limit,
    });
  }
}
