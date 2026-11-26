import {
  ReportFormat,
  type ReportDownload,
  type ReportResult,
} from '@contracts/reports';
import type { ReportRunState } from '../domain/report-run.js';
import { CsvWriter } from './csv-writer.js';

/** The download file of a ready run, in its format. Pure utility. */
export class ReportFiles {
  /**
   * Builds the download of a ready run in its format.
   * @param run Ready run.
   * @param result Stored result.
   * @returns The file name, type and content.
   */
  static of(run: ReportRunState, result: ReportResult): ReportDownload {
    const name = `${run.type}-${run.params.from}-${run.params.to}`;
    if (run.format === ReportFormat.Csv) {
      return {
        fileName: `${name}.csv`,
        contentType: 'text/csv; charset=utf-8',
        content: CsvWriter.write([
          result.columns.map((column) => column.header),
          ...result.rows.map((row) => row.cells),
        ]),
      };
    }
    return {
      fileName: `${name}.json`,
      contentType: 'application/json',
      content: JSON.stringify(result),
    };
  }
}
