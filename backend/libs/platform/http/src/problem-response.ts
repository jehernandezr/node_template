import type { ProblemDetails } from '@contracts/platform';

/** Respuesta de error lista para escribirse: estado, cuerpo Problem Details y headers. */
export interface ProblemResponse {
  readonly status: number;
  readonly body: ProblemDetails;
  readonly headers: Record<string, string>;
}
