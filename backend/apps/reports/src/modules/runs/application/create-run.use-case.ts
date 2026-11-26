import { ActingMember } from '@platform/auth';
import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { PlatformErrorCode } from '@contracts/platform';
import {
  ExecuteRunCommand,
  ReportFormat,
  type CreateReportRunRequest,
  type ReportRunCreated,
} from '@contracts/reports';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { ReportsError } from '../../../shared/errors/reports.error.js';
import { ReportDefinitionRegistry } from '../../catalog/index.js';
import { ReportEntitlements } from '../domain/report-entitlements.js';
import { ReportRangePolicy } from '../domain/report-range-policy.js';
import { ReportRunRepository } from '../domain/report-run.repository.js';
import { ReportRun } from '../domain/report-run.js';

/**
 * Queues the run and sends `reports.run.execute.v1` through the outbox in the same transaction: the
 * computation leaves the request and a worker picks it up. CSV requires the `advanced_reports` feature, which
 * depends on the body and is therefore checked here and not on the route.
 */
@Injectable()
export class CreateRun {
  constructor(
    private readonly runs: ReportRunRepository,
    private readonly registry: ReportDefinitionRegistry,
    private readonly entitlements: ReportEntitlements,
    private readonly bus: MessageBus,
    private readonly shard: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /**
   * @throws ReportsError `REPORTS.TYPE.UNKNOWN`, `REPORTS.PARAMS.INVALID_RANGE` o
   *   `PLATFORM.ACCESS.FEATURE_NOT_INCLUDED`.
   */
  async execute(
    member: ActingMember,
    request: CreateReportRunRequest,
  ): Promise<ReportRunCreated> {
    this.registry.get(request.type);
    ReportRangePolicy.assertValid(request.params);
    await this.assertFormatIncluded(member, request.format);
    const run = ReportRun.request({
      id: this.ids.next().toString(),
      type: request.type,
      format: request.format,
      params: request.params,
      requestedBy: member.ref,
      now: this.clock.now(),
    });
    return this.shard.inTenantShard(member.tenantId, () =>
      this.transactions.runInTransaction(async () => {
        await this.runs.insert(run);
        await this.bus.send(
          ExecuteRunCommand,
          { tenantId: member.tenantId, runId: run.snapshot().id },
          { tenantId: member.tenantId },
        );
        return { runId: run.snapshot().id };
      }),
    );
  }

  private async assertFormatIncluded(
    member: ActingMember,
    format: ReportFormat,
  ): Promise<void> {
    if (format !== ReportFormat.Csv) {
      return;
    }
    const included =
      member.person &&
      (await this.entitlements.allowsAdvancedReports(
        member.tenantId,
        member.ref.userId,
      ));
    if (!included) {
      throw new ReportsError(PlatformErrorCode.AccessFeatureNotIncluded, {
        format,
      });
    }
  }
}
