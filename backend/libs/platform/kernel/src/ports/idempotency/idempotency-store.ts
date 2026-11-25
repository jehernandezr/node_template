import type { ClaimRequest } from './claim-request.js';
import type { ClaimResult } from './claim-result.js';

/**
 * Three-state idempotency port with fencing.
 * - `claim` is atomic per key. An expired lease can be taken by another attempt,
 *   which receives a new token and invalidates the previous one.
 * - `complete` stores the final result and only accepts it from the current token.
 *   In production it is written in the same unit of work as the effects.
 * - `release` deletes an in-progress claim (to allow another attempt) and also
 *   requires the current token.
 * `complete` and `release` reject a stale token with an expired claim error.
 */
export abstract class IdempotencyStore<R = unknown> {
  abstract claim(key: string, request: ClaimRequest): Promise<ClaimResult<R>>;

  abstract complete(key: string, claimToken: string, result: R): Promise<void>;

  abstract release(key: string, claimToken: string): Promise<void>;
}
