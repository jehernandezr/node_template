import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  ReportsErrorCode,
  ReportsLimits,
  RunCompletedEvent,
  type ExecuteRunPayload,
  type ReportResult,
} from '@contracts/reports';
import { Clock, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { ReportsSettings } from '../../../config/reports-settings.js';
import { ReportDefinitionRegistry } from '../../catalog/index.js';
import { ReportResultStore } from '../domain/report-result-store.js';
import { ReportRunRepository } from '../domain/report-run.repository.js';
import type { ReportRun } from '../domain/report-run.js';

/**
 * Computes a run in the worker and stores the result in `ReportResultStore`, or marks it failed if it
 * exceeds the maximum size, and publishes `reports.run.completed.v1` in the same transaction. A run that has already
 * finished is not repeated.
 */
@Injectable()
export class ExecuteRun {
  private static readonly DAY_MS = 86_400_000;
  private readonly maxBytes: number;
  private readonly ttlMs: number;

  constructor(
    private readonly runs: ReportRunRepository,
    private readonly results: ReportResultStore,
    private readonly registry: ReportDefinitionRegistry,
    private readonly bus: MessageBus,
    private readonly shard: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
    settings: ReportsSettings,
  ) {
    this.maxBytes = settings.values.REPORTS_MAX_RESULT_BYTES;
    this.ttlMs = settings.values.REPORTS_RESULT_TTL_DAYS * ExecuteRun.DAY_MS;
  }

  execute(command: ExecuteRunPayload): Promise<void> {
    return this.shard.inTenantShard(command.tenantId, async () => {
      const pending = await this.runs.find(command.runId);
      if (pending === undefined || !pending.isPending()) {
        return;
      }
      pending.start();
      const run = await this.transactions.runInTransaction(() =>
        this.runs.update(pending),
      );
      const result = await this.compute(command.tenantId, run);
      await this.transactions.runInTransaction(async () => {
        this.settle(run, result);
        await this.runs.update(run);
        if (run.isReady()) {
          await this.results.save(run.snapshot().id, result);
        }
        await this.publish(command.tenantId, run);
      });
    });
  }

  private async compute(
    tenantId: string,
    run: ReportRun,
  ): Promise<ReportResult> {
    const state = run.snapshot();
    const definition = this.registry.get(state.type);
    return {
      columns: [...definition.columns],
      rows: await definition.rows(tenantId, state.params),
    };
  }

  private settle(run: ReportRun, result: ReportResult): void {
    const bytes = Buffer.byteLength(JSON.stringify(result));
    const now = this.clock.now();
    if (bytes > this.maxBytes || result.rows.length > ReportsLimits.maxRows) {
      run.fail(ReportsErrorCode.ResultTooLarge, now);
    } else {
      run.complete(bytes, now, this.ttlMs);
    }
  }

  private async publish(tenantId: string, run: ReportRun): Promise<void> {
    const state = run.snapshot();
    await this.bus.publish(
      RunCompletedEvent,
      {
        tenantId,
        runId: state.id,
        type: state.type,
        status: state.status,
        requestedBy: state.requestedBy,
        completedAt: (state.completedAt ?? this.clock.now()).toISOString(),
      },
      { tenantId },
    );
  }
}
