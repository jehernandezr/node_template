import type {
  ReportFormat,
  ReportParams,
  ReportRunStatus,
  ReportType,
} from '@contracts/reports';
import { ReportRun } from '../../domain/report-run.js';
import { ReportRunEntity } from './entities/report-run.entity.js';

/**
 * `report_runs` row and `ReportRun` aggregate, in both directions, without the `result` column, which belongs to
 * `RowReportResultStore`. Pure utility.
 */
export class ReportRunMapper {
  /**
   * Rebuilds a run from its row.
   * @param row Stored row.
   * @returns The domain run.
   */
  static toDomain(row: ReportRunEntity): ReportRun {
    return ReportRun.rehydrate({
      id: row.id,
      type: row.type as ReportType,
      format: row.format as ReportFormat,
      params: row.params as unknown as ReportParams,
      status: row.status as ReportRunStatus,
      requestedBy: {
        userId: row.requestedBy,
        homeTenantId: row.requestedByHomeTenantId,
      },
      createdAt: row.createdAt ?? new Date(0),
      ...(row.resultBytes === null ? {} : { resultBytes: row.resultBytes }),
      ...(row.completedAt === null ? {} : { completedAt: row.completedAt }),
      ...(row.expiresAt === null ? {} : { expiresAt: row.expiresAt }),
      ...(row.failureCode === null ? {} : { failureCode: row.failureCode }),
      ...(row.version === undefined ? {} : { version: row.version }),
    });
  }

  /**
   * Turns a run into its row.
   * @param run Domain run.
   * @returns The row to store.
   */
  static toRow(run: ReportRun): ReportRunEntity {
    const state = run.snapshot();
    return Object.assign(new ReportRunEntity(), {
      id: state.id,
      type: state.type,
      format: state.format,
      params: { ...state.params },
      status: state.status,
      requestedBy: state.requestedBy.userId,
      requestedByHomeTenantId: state.requestedBy.homeTenantId,
      resultBytes: state.resultBytes ?? null,
      completedAt: state.completedAt ?? null,
      expiresAt: state.expiresAt ?? null,
      failureCode: state.failureCode ?? null,
      createdAt: state.createdAt,
      ...(state.version === undefined ? {} : { version: state.version }),
    });
  }
}
