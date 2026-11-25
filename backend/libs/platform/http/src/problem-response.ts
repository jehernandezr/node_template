import type { ProblemDetails } from '@contracts/platform';

/** Error response ready to be written: status, Problem Details body and headers. */
export interface ProblemResponse {
  readonly status: number;
  readonly body: ProblemDetails;
  readonly headers: Record<string, string>;
}
