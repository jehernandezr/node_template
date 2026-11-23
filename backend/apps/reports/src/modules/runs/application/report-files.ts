import {
  ReportFormat,
  type ReportDownload,
  type ReportResult,
} from '@contracts/reports';
import type { ReportRunState } from '../domain/report-run.js';
import { CsvWriter } from './csv-writer.js';

/** El archivo de descarga de una ejecución lista, en su formato. Utilidad pura. */
export class ReportFiles {
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
