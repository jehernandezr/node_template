import type { UserRef } from '@contracts/platform';
import {
  ReportRunStatus,
  ReportsErrorCode,
  type ReportFormat,
  type ReportParams,
  type ReportType,
} from '@contracts/reports';
import { ReportsError } from '../../../shared/errors/reports.error.js';

/** Estado completo de una ejecución de reporte, tal como se guarda. */
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
 * Una ejecución de reporte: en cola, corriendo, lista hasta que su resultado vence, o fallida. El resultado
 * lo guarda `ReportResultStore`; la ejecución sabe su tamaño y hasta cuándo se entrega.
 */
export class ReportRun {
  private constructor(private state: ReportRunState) {}

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

  static rehydrate(state: ReportRunState): ReportRun {
    return new ReportRun(state);
  }

  snapshot(): ReportRunState {
    return this.state;
  }

  /** En cola o corriendo: un worker puede tomarla, también si murió a mitad del cálculo. */
  isPending(): boolean {
    return (
      this.state.status === ReportRunStatus.Queued ||
      this.state.status === ReportRunStatus.Running
    );
  }

  start(): void {
    this.state = { ...this.state, status: ReportRunStatus.Running };
  }

  complete(resultBytes: number, now: Date, ttlMs: number): void {
    this.state = {
      ...this.state,
      status: ReportRunStatus.Ready,
      resultBytes,
      completedAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
    };
  }

  fail(code: string, now: Date): void {
    this.state = {
      ...this.state,
      status: ReportRunStatus.Failed,
      failureCode: code,
      completedAt: now,
    };
  }

  /**
   * Que la ejecución esté lista y su resultado vigente.
   * @throws ReportsError `REPORTS.RUN.EXPIRED` si venció, o `REPORTS.RUN.NOT_READY` si no terminó bien.
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

  isReady(): boolean {
    return this.state.status === ReportRunStatus.Ready;
  }
}
