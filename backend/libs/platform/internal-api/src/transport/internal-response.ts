import type { CallOutcome } from '@platform/primitives';

/** Cuerpo JSON de la respuesta, con estado HTTP 200 sea cual sea el resultado de la llamada. */
export interface InternalResponse {
  readonly outcome: CallOutcome<unknown>;
}
