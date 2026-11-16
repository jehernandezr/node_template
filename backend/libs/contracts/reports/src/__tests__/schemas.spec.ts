import { validateContract } from '@contracts/platform';
import type { z } from 'zod';
import { reportsContract } from '../contract.js';
import { ReportsLimits } from '../constants/reports.constants.js';
import {
  ReportColumnKind,
  ReportFormat,
  ReportGranularity,
  ReportType,
} from '../enums/reports.enum.js';
import {
  Ids,
  Params,
  Requester,
  Result,
  RunSummary,
  UuidV4,
} from './utils/fixtures.js';

const schemas = reportsContract.schemas as Record<string, z.ZodType>;

const column = (index: number) => ({
  key: `col${index}`,
  header: 'Columna',
  kind: ReportColumnKind.Text,
});

const createRequest = {
  type: ReportType.TasksByStatus,
  format: ReportFormat.Csv,
  params: Params,
};

describe('reports schemas', () => {
  it('limits the number of columns of a result', () => {
    const columns = Array.from(
      { length: ReportsLimits.maxColumns + 1 },
      (_, i) => column(i),
    );
    expect(
      validateContract(schemas.ReportResult, { columns, rows: [] }).ok,
    ).toBe(false);
    expect(
      validateContract(schemas.ReportResult, {
        columns: columns.slice(0, ReportsLimits.maxColumns),
        rows: [],
      }).ok,
    ).toBe(true);
  });

  it('limits the number of rows of a result', () => {
    const rows = Array.from({ length: ReportsLimits.maxRows + 1 }, () => ({
      cells: ['x'],
    }));
    expect(
      validateContract(schemas.ReportResult, { columns: [], rows }).ok,
    ).toBe(false);
  });

  it('limits the number of cells of a row', () => {
    const cells = Array.from(
      { length: ReportsLimits.maxColumns + 1 },
      () => 'x',
    );
    expect(validateContract(schemas.ReportRow, { cells }).ok).toBe(false);
  });

  it('limits the length of a cell', () => {
    expect(
      validateContract(schemas.ReportRow, {
        cells: ['a'.repeat(ReportsLimits.cellMaxLength + 1)],
      }).ok,
    ).toBe(false);
    expect(
      validateContract(schemas.ReportRow, {
        cells: ['a'.repeat(ReportsLimits.cellMaxLength)],
      }).ok,
    ).toBe(true);
  });

  it('limits the length of a column key and header', () => {
    expect(
      validateContract(schemas.ReportColumn, {
        key: 'a'.repeat(ReportsLimits.columnKeyMaxLength + 1),
        header: 'Estado',
        kind: ReportColumnKind.Text,
      }).ok,
    ).toBe(false);
    expect(
      validateContract(schemas.ReportColumn, {
        key: 'status',
        header: '',
        kind: ReportColumnKind.Text,
      }).ok,
    ).toBe(false);
  });

  it('limits the file name of a download', () => {
    const download = {
      fileName: 'a'.repeat(ReportsLimits.fileNameMaxLength + 1),
      contentType: 'text/csv',
      content: 'status\nopen\n',
    };
    expect(validateContract(schemas.ReportDownload, download).ok).toBe(false);
    expect(
      validateContract(schemas.ReportDownload, {
        ...download,
        fileName: 'reporte.csv',
      }).ok,
    ).toBe(true);
  });

  it('accepts only calendar dates in the report parameters', () => {
    expect(
      validateContract(schemas.CreateReportRunRequest, {
        ...createRequest,
        params: { ...Params, from: '2026/11/01' },
      }).ok,
    ).toBe(false);
    expect(
      validateContract(schemas.CreateReportRunRequest, createRequest).ok,
    ).toBe(true);
  });

  it('caps the pages of runs at one hundred items', () => {
    const items = Array.from({ length: 101 }, () => RunSummary);
    expect(
      validateContract(schemas.ReportRunPage, { items, nextCursor: null }).ok,
    ).toBe(false);
    expect(
      validateContract(schemas.ReportRunPage, {
        items: items.slice(0, 100),
        nextCursor: null,
      }).ok,
    ).toBe(true);
  });

  it('keeps the catalog within its limits', () => {
    const entry = {
      type: ReportType.TasksByStatus,
      formats: [ReportFormat.Json, ReportFormat.Csv],
      granularities: [ReportGranularity.Day],
    };
    expect(
      validateContract(schemas.ReportCatalog, {
        items: Array.from(
          { length: ReportsLimits.maxCatalogEntries + 1 },
          () => entry,
        ),
      }).ok,
    ).toBe(false);
    expect(
      validateContract(schemas.ReportCatalogEntry, { ...entry, formats: [] })
        .ok,
    ).toBe(false);
  });

  it('accepts a run detail with a result and a run without one', () => {
    expect(
      validateContract(schemas.ReportRunDetail, {
        ...RunSummary,
        result: Result,
      }).ok,
    ).toBe(true);
    expect(
      validateContract(schemas.ReportRunDetail, { ...RunSummary, result: null })
        .ok,
    ).toBe(true);
  });

  it('rejects a run with a status outside the enum', () => {
    expect(
      validateContract(schemas.ReportRunSummary, {
        ...RunSummary,
        status: 'archived',
      }).ok,
    ).toBe(false);
  });

  it('validates the list filters and the cursor', () => {
    expect(
      validateContract(schemas.ListReportRunsRequest, {
        type: ReportType.TasksByStatus,
        limit: 101,
      }).ok,
    ).toBe(false);
    expect(
      validateContract(schemas.ListReportRunsRequest, { after: 'cursor' }).ok,
    ).toBe(true);
  });

  it('bounds the report range to the maximum number of days', () => {
    expect(ReportsLimits.maxRangeDays).toBe(366);
  });

  it('erases the user with a valid user reference', () => {
    expect(
      validateContract(schemas.EraseReportsUserInput, { user: Requester }).ok,
    ).toBe(true);
    expect(
      validateContract(schemas.EraseReportsUserInput, {
        user: { userId: UuidV4, homeTenantId: Ids.tenant },
      }).ok,
    ).toBe(false);
  });
});
