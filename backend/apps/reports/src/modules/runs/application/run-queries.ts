import { IdCursor } from '@platform/criteria';
import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  ReportsErrorCode,
  type ListReportRunsRequest,
  type ReportDownload,
  type ReportRunDetail,
  type ReportResult,
  type ReportRunPage,
} from '@contracts/reports';
import { Clock } from '@platform/kernel';
import { ReportsDefaults } from '../../../shared/constants/reports-defaults.constants.js';
import { ReportsError } from '../../../shared/errors/reports.error.js';
import { ReportResultStore } from '../domain/report-result-store.js';
import { ReportRunRepository } from '../domain/report-run.repository.js';
import type { ReportRun } from '../domain/report-run.js';
import { ReportFiles } from './report-files.js';
import { RunViews } from './run-views.js';

/** Reads of a tenant's runs: the list, the detail with its result and the download. */
@Injectable()
export class RunQueries {
  constructor(
    private readonly runs: ReportRunRepository,
    private readonly results: ReportResultStore,
    private readonly shard: ShardScopes,
    private readonly clock: Clock,
    private readonly cursors: IdCursor,
  ) {}

  list(
    tenantId: string,
    request: ListReportRunsRequest,
  ): Promise<ReportRunPage> {
    const limit = request.limit ?? ReportsDefaults.pageSize;
    return this.shard.inTenantShard(tenantId, async () => {
      const page = await this.runs.page({
        type: request.type,
        status: request.status,
        afterId: this.cursors.idOf(request.after),
        limit: limit + 1,
      });
      const items = page.slice(0, limit).map((run) => run.snapshot());
      const last = items.at(-1);
      return {
        items: items.map((state) => RunViews.summary(state)),
        nextCursor:
          page.length > limit && last !== undefined
            ? this.cursors.after(last.id)
            : null,
      };
    });
  }

  /** @throws ReportsError `REPORTS.RUN.NOT_FOUND`. */
  get(tenantId: string, runId: string): Promise<ReportRunDetail> {
    return this.shard.inTenantShard(tenantId, async () => {
      const run = await this.require(runId);
      const result = run.isReady() ? await this.results.load(runId) : undefined;
      return RunViews.detail(run.snapshot(), result);
    });
  }

  /** @throws ReportsError `REPORTS.RUN.NOT_FOUND`, `REPORTS.RUN.NOT_READY` o `REPORTS.RUN.EXPIRED`. */
  download(tenantId: string, runId: string): Promise<ReportDownload> {
    return this.shard.inTenantShard(tenantId, async () => {
      const run = await this.require(runId);
      run.assertReady(this.clock.now());
      return ReportFiles.of(run.snapshot(), await this.stored(run));
    });
  }

  /** @throws ReportsError `REPORTS.RUN.NOT_READY` if the run is ready but its result is gone. */
  private async stored(run: ReportRun): Promise<ReportResult> {
    const state = run.snapshot();
    const result = await this.results.load(state.id);
    if (result === undefined) {
      throw new ReportsError(ReportsErrorCode.RunNotReady, {
        status: state.status,
      });
    }
    return result;
  }

  private async require(runId: string): Promise<ReportRun> {
    const run = await this.runs.find(runId);
    if (run === undefined) {
      throw new ReportsError(ReportsErrorCode.RunNotFound);
    }
    return run;
  }
}
