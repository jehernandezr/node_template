import type { ErrorCatalogEntry } from './error-catalog-entry.type.js';
import type { FieldError } from './problem-details.type.js';

/** Datos de una respuesta de error que no salen del catálogo. */
export interface ProblemDetailsInput {
  readonly entry: ErrorCatalogEntry;
  readonly title: string;
  readonly detail?: string;
  readonly instance?: string;
  readonly traceId?: string;
  readonly errors?: FieldError[];
  /** Datos del error; solo salen los que la entrada del catálogo declara en `publicDetails`. */
  readonly details?: Readonly<Record<string, unknown>>;
}
