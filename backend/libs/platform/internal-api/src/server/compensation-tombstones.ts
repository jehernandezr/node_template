import { ClaimState } from '@platform/kernel';
import { CallOutcome, type Deadline } from '@platform/primitives';
import { CompensationKey } from '../contract/compensation-key.js';
import { IdempotencyKeyPolicy } from '../contract/idempotency-key-policy.js';
import { InternalApiReason } from '../contract/internal-api-reason.enum.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import type { CallMeta } from '../transport/call-meta.js';
import type { ProcessedOperationStore } from './processed-operation-store.js';

/**
 * Before running a saga compensation it lays a tombstone on the key of the step it undoes. If that step never arrived,
 * the tombstone leaves it completed as compensated and a late send no longer applies its effect, which nobody would undo. If the
 * step is still in progress, the compensation waits: it responds `in-progress` and the saga repeats it once the step finished. If
 * the step already finished, the compensation runs as usual.
 */
export class CompensationTombstones {
  constructor(private readonly store: ProcessedOperationStore) {}

  /**
   * Lays the tombstone on the key of each `forwards` operation that the compensation of `meta` undoes. Returns the
   * result to respond with if the compensation has to wait, or `undefined` if it can run.
   */
  async lay(
    forwards: readonly string[],
    meta: CallMeta,
    deadline: Deadline,
  ): Promise<CallOutcome<never> | undefined> {
    const forwardKey = CompensationKey.forwardOf(meta.idempotencyKey);
    if (forwardKey === undefined) {
      return undefined;
    }
    for (const operationId of forwards) {
      const key = IdempotencyKeyPolicy.storeKey({
        tenantId: meta.tenantId,
        operationId,
        idempotencyKey: forwardKey,
      });
      if (!IdempotencyKeyPolicy.fitsStore(key)) {
        continue;
      }
      const claim = await this.store.claim(key, {
        fingerprint: CompensationKey.TOMBSTONE_FINGERPRINT,
        deadline,
        ...(meta.tenantId !== undefined && { tenantId: meta.tenantId }),
      });
      if (claim.state === ClaimState.InProgress) {
        return CallOutcome.transientFailure(InternalApiReason.InProgress);
      }
      if (claim.state === ClaimState.Acquired) {
        await this.store.complete(
          key,
          claim.claimToken,
          CallOutcome.businessError(InternalApiErrorCode.StepCompensated),
        );
      }
    }
    return undefined;
  }
}
