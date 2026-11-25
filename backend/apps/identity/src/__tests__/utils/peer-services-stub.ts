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
import { TenantDirectoryFollowers } from '../../modules/tenants/index.js';
import { ErasureHold } from './erasure-hold.js';

/** What the plan of a tenant allows of a metric and what it already used. */
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
 * Fake billing, notifications, tasks and reports for identity: they answer the saga steps, the placements in their
 * directories and the quota checks, and record every operation they receive. A tenant without a set quota has no
 * subscription.
 */
export class PeerServicesStub {
  readonly received: string[] = [];
  /** The tenants each directory has recorded, by the id of the operation that places them. */
  readonly placed = new Map<string, Set<string>>();
  private readonly refused = new Set<string>();
  private readonly holds = new Map<string, ErasureHold>();
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

  /** Starts listening on a free local port. */
  async start(): Promise<void> {
    await new Promise<void>((resolve) =>
      this.server.listen(0, '127.0.0.1', resolve),
    );
  }

  /** Closes every connection and stops listening. */
  async stop(): Promise<void> {
    this.server.closeAllConnections();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  /**
   * The URLs of the four services, all pointing at this stub.
   * @returns The base URL of each service.
   */
  baseUrls(): Record<string, string> {
    const { port } = this.server.address() as AddressInfo;
    const url = `http://127.0.0.1:${port}`;
    return { billing: url, notifications: url, tasks: url, reports: url };
  }

  /**
   * Billing refuses the account of the tenants this user creates.
   * @param ownerUserId Owner whose tenants are refused.
   */
  refuseAccountsOf(ownerUserId: string): void {
    this.refused.add(ownerUserId);
  }

  /**
   * Holds the answer to the tasks erasure step of a user until the returned hold is released, so a test can act
   * while the deletion of that account is in flight.
   * @param userId User whose erasure is held.
   * @returns The hold.
   */
  holdErasureOf(userId: string): ErasureHold {
    const hold = new ErasureHold();
    this.holds.set(userId, hold);
    return hold;
  }

  /**
   * Sets the quota of a metric of the tenant, as if it had a subscription with that plan.
   * @param tenantId Tenant.
   * @param metric Metric.
   * @param quota Limit and usage.
   */
  limit(tenantId: string, metric: UsageMetric, quota: StubQuota): void {
    this.quotas.set(`${tenantId}:${metric}`, quota);
  }

  /**
   * The first `checks` checks of the metric answer that the tenant has no subscription, without a limit, and the
   * next ones answer with `quota`: so another member takes the last seat between two checks. An answer without a
   * subscription is not kept in the quota cache of the service, so the second check reaches this stub.
   * @param tenantId Tenant.
   * @param metric Metric.
   * @param quota Limit and usage after the first checks.
   * @param checks How many checks answer without a subscription.
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
    await this.heldErasure(operationId, input)?.arrive();
    response
      .writeHead(200, { 'content-type': 'application/json' })
      .end(
        JSON.stringify({ outcome: this.outcomeOf(request.url ?? '', input) }),
      );
  }

  private outcomeOf(path: string, input: Input): unknown {
    const tenantId = String(input.tenantId);
    const directory = this.directoryOf(path);
    if (directory !== undefined) {
      return this.answerDirectory(path, directory, tenantId);
    }
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

  private heldErasure(
    operationId: string,
    input: Input,
  ): ErasureHold | undefined {
    if (operationId !== EraseTasksUserDataOperation.id) {
      return undefined;
    }
    const hold = this.holds.get(String(input.user?.userId));
    this.holds.delete(String(input.user?.userId));
    return hold;
  }

  /** The placement operation of the directory a placement or removal call goes to. */
  private directoryOf(path: string): string | undefined {
    return TenantDirectoryFollowers.ALL.find((follower) =>
      [follower.tenantDirectoryPlace, follower.tenantDirectoryRemove].some(
        (operation) => InternalApiRoute.pathOf(operation.id) === path,
      ),
    )?.tenantDirectoryPlace.id;
  }

  private answerDirectory(
    path: string,
    directory: string,
    tenantId: string,
  ): unknown {
    const tenants = this.placed.get(directory) ?? new Set<string>();
    this.placed.set(directory, tenants);
    if (path === InternalApiRoute.pathOf(directory)) {
      tenants.add(tenantId);
    } else {
      tenants.delete(tenantId);
    }
    return CallOutcome.success({ tenantId });
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
