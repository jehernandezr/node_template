import type { UserRef } from '@contracts/platform';
import {
  ReportRunStatus,
  ReportsErrorCode,
  type ReportFormat,
  type ReportParams,
  type ReportType,
} from '@contracts/reports';
import { ReportsError } from '../../../shared/errors/reports.error.js';

/** Full state of a report run, as stored. */
export interface ReportRunState {
  readonly id: string;
  readonly type: ReportType;
  readonly format: ReportFormat;
  readonly params: ReportParams;
  readonly status: ReportRunStatus;
  readonly requestedBy: UserRef;
  readonly createdAt: Date;
  readonly resultBytes?: number;
  readonly completedAt?: Date;
  readonly expiresAt?: Date;
  readonly failureCode?: string;
  readonly version?: number;
}

/**
 * A report run: queued, running, ready until its result expires, or failed. The result
 * is stored by `ReportResultStore`; the run knows its size and until when it is delivered.
 */
export class ReportRun {
  private constructor(private state: ReportRunState) {}

  /**
   * Queues a new run.
   * @param input Id, type, format, parameters, requester and instant.
   * @returns The queued run.
   */
  static request(input: {
    readonly id: string;
    readonly type: ReportType;
    readonly format: ReportFormat;
    readonly params: ReportParams;
    readonly requestedBy: UserRef;
    readonly now: Date;
  }): ReportRun {
    return new ReportRun({
      id: input.id,
      type: input.type,
      format: input.format,
      params: input.params,
      requestedBy: input.requestedBy,
      status: ReportRunStatus.Queued,
      createdAt: input.now,
    });
  }

  /**
   * Rebuilds a run from its state.
   * @param state Stored run.
   * @returns The run.
   */
  static rehydrate(state: ReportRunState): ReportRun {
    return new ReportRun(state);
  }

  /**
   * Copies the run state to store or show it.
   * @returns The run state.
   */
  snapshot(): ReportRunState {
    return this.state;
  }

  /**
   * Queued or running: a worker can pick it up, also if it died halfway through the computation.
   * @returns `true` while queued or running.
   */
  isPending(): boolean {
    return (
      this.state.status === ReportRunStatus.Queued ||
      this.state.status === ReportRunStatus.Running
    );
  }

  /** Marks the run as running. */
  start(): void {
    this.state = { ...this.state, status: ReportRunStatus.Running };
  }

  /**
   * Marks the run ready with a result that expires after `ttlMs`.
   * @param resultBytes Size of the result.
   * @param now Instant it finished.
   * @param ttlMs How long the result is kept.
   */
  complete(resultBytes: number, now: Date, ttlMs: number): void {
    this.state = {
      ...this.state,
      status: ReportRunStatus.Ready,
      resultBytes,
      completedAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
    };
  }

  /**
   * Marks the run failed.
   * @param code Error code of the failure.
   * @param now Instant it failed.
   */
  fail(code: string, now: Date): void {
    this.state = {
      ...this.state,
      status: ReportRunStatus.Failed,
      failureCode: code,
      completedAt: now,
    };
  }

  /**
   * Ensures the run is ready and its result is current.
   * @param now Current instant.
   * @throws ReportsError `REPORTS.RUN.EXPIRED` if it expired, or `REPORTS.RUN.NOT_READY` if it did not finish successfully.
   */
  assertReady(now: Date): void {
    const { status, expiresAt } = this.state;
    if (
      status === ReportRunStatus.Expired ||
      (expiresAt !== undefined && expiresAt <= now)
    ) {
      throw new ReportsError(ReportsErrorCode.RunExpired);
    }
    if (status !== ReportRunStatus.Ready) {
      throw new ReportsError(ReportsErrorCode.RunNotReady, { status });
    }
  }

  /**
   * Tells whether the run finished successfully.
   * @returns `true` when ready.
   */
  isReady(): boolean {
    return this.state.status === ReportRunStatus.Ready;
  }
}
