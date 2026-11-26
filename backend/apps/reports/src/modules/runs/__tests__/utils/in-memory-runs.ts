import {
  ReportRunRepository,
  type ReportRunPageRequest,
} from '../../domain/report-run.repository.js';
import { ReportRun } from '../../domain/report-run.js';

/** Runs of one tenant kept in memory as snapshots. */
export class InMemoryRuns extends ReportRunRepository {
  private readonly stored = new Map<string, ReportRun>();

  override async insert(run: ReportRun): Promise<void> {
    this.stored.set(run.snapshot().id, ReportRun.rehydrate(run.snapshot()));
  }

  override async find(runId: string): Promise<ReportRun | undefined> {
    const run = this.stored.get(runId);
    return run === undefined ? undefined : ReportRun.rehydrate(run.snapshot());
  }

  override async update(run: ReportRun): Promise<ReportRun> {
    this.stored.set(run.snapshot().id, ReportRun.rehydrate(run.snapshot()));
    return run;
  }

  override async page(
    request: ReportRunPageRequest,
  ): Promise<readonly ReportRun[]> {
    return [...this.stored.values()]
      .map((run) => run.snapshot())
      .filter(
        (state) =>
          (request.type === undefined || state.type === request.type) &&
          (request.status === undefined || state.status === request.status) &&
          (request.afterId === undefined || state.id < request.afterId),
      )
      .sort((left, right) => right.id.localeCompare(left.id))
      .slice(0, request.limit)
      .map((state) => ReportRun.rehydrate(state));
  }

  /** The stored state of a run. */
  stateOf(runId: string) {
    return this.stored.get(runId)?.snapshot();
  }
}
