import type { CallOutcome } from '@platform/primitives';

/** JSON body of the response, with HTTP status 200 whatever the result of the call. */
export interface InternalResponse {
  readonly outcome: CallOutcome<unknown>;
}
