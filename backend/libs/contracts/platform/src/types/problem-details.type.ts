/**
 * Detail of an invalid field or of a partial error.
 * `field` is the field path with dot-separated segments, for example `items.0.name`.
 */
export interface FieldError {
  field?: string;
  code: string;
  message?: string;
}

/** Former name of `FieldError`. */
export type ProblemFieldError = FieldError;

/**
 * RFC 9457 error response (Problem Details) with platform extensions.
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code: string;
  traceId?: string;
  errors?: FieldError[];
  /** Data the error code declares public, for example the URL of the tenant's region. */
  details?: ProblemDetailsDetails;
}

/** Public data of an error, each with a `ProblemDetailKey` key. */
export interface ProblemDetailsDetails {
  /** API URL of the region where the tenant lives. */
  apiBaseUrl?: string;
  region?: string;
}
