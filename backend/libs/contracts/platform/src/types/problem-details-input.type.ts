import type { ErrorCatalogEntry } from './error-catalog-entry.type.js';
import type { FieldError } from './problem-details.type.js';

/** Data of an error response that does not come from the catalog. */
export interface ProblemDetailsInput {
  readonly entry: ErrorCatalogEntry;
  readonly title: string;
  readonly detail?: string;
  readonly instance?: string;
  readonly traceId?: string;
  readonly errors?: FieldError[];
  /** Error data; only those the catalog entry declares in `publicDetails` go out. */
  readonly details?: Readonly<Record<string, unknown>>;
}
