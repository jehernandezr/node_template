import { ClaimState, type Clock, type Guard } from '@platform/kernel';
import { CanonicalJson, Deadline } from '@platform/primitives';
import type { MessageEnvelope } from '../envelope/message-envelope.js';
import { MessagingError } from '../errors/messaging-error.js';
import { MessagingErrorCode } from '../errors/messaging-error-code.enum.js';
import {
  type AcquiredMessageClaim,
  ClaimOutcomeKind,
  type ClaimOutcome,
} from './claim-outcome.js';
import { DispatchOutcome } from './dispatch-outcome.enum.js';
import type { DispatchOptions } from './dispatch-options.js';
import { ProcessedMessageKey } from './processed-message-key.js';
import type { ProcessedMessageStore } from './processed-message-store.js';

/** Lease settings that {@link ClaimGuard} requests from the store. */
export interface ClaimGuardConfig {
  /**
   * Minimum lease in milliseconds: the visibility timeout of the consumer
   * queue, or `ClaimGuard.DEFAULT_LEASE_MS`. A larger `visibilityTimeoutMs`
   * in the delivery raises it.
   */
  readonly baseLeaseMs: number;
  /** Extra margin over the lease. Defaults to the one in `ClaimRules`. */
  readonly leaseMarginMs?: number;
}

/**
 * Idempotency claim of a delivery with `ProcessedMessageStore`: takes the
 * claim of `(consumer, id)`, completes it or releases it.
 */
export class ClaimGuard {
  /** Lease when neither the options nor the topology give a visibility timeout (the SQS one). */
  static readonly DEFAULT_LEASE_MS = 30_000;

  constructor(
    private readonly store: ProcessedMessageStore,
    private readonly clock: Clock,
    guard: Guard,
    private readonly config: ClaimGuardConfig,
  ) {
    guard.positiveInteger('baseLeaseMs', config.baseLeaseMs);
    if (config.leaseMarginMs !== undefined) {
      guard.nonNegativeFinite('leaseMarginMs', config.leaseMarginMs);
    }
  }

  /**
   * Fingerprint of the message: its type, its tenant and its data in canonical JSON.
   * @throws MessagingError `InvalidEnvelope` if `data` is not canonical JSON.
   */
  fingerprint(envelope: MessageEnvelope): string {
    try {
      return CanonicalJson.digest({
        type: envelope.type,
        tenantid: envelope.tenantid ?? null,
        data: envelope.data,
      });
    } catch {
      throw new MessagingError(
        MessagingErrorCode.InvalidEnvelope,
        'invalid envelope: data is not canonical JSON',
      );
    }
  }

  /**
   * Takes the claim of `(consumer, envelope.id)` on behalf of the message tenant, so that moving the tenant
   * carries what was processed. Resolves `Settled` with
   * `Duplicate`, `InProgress` or `DeadLetter` (the stored fingerprint differs:
   * idempotency conflict; if the claim had been acquired, it is returned).
   * If the store fails, the error propagates as is.
   */
  async claim(
    envelope: MessageEnvelope,
    fingerprint: string,
    consumer: string,
    options: DispatchOptions,
  ): Promise<ClaimOutcome> {
    const key = ProcessedMessageKey.of(consumer, envelope.id);
    const leaseMs = Math.max(
      this.config.baseLeaseMs,
      options.visibilityTimeoutMs ?? 0,
    );
    const result = await this.store.claim(key, {
      fingerprint,
      deadline: Deadline.after(leaseMs, this.clock),
      minLeaseMs: leaseMs,
      ...(envelope.tenantid === undefined
        ? {}
        : { tenantId: envelope.tenantid }),
      ...(this.config.leaseMarginMs === undefined
        ? {}
        : { leaseMarginMs: this.config.leaseMarginMs }),
    });

    if (result.fingerprint !== fingerprint) {
      if (result.state === ClaimState.Acquired) {
        await this.release({ key, token: result.claimToken });
      }
      return {
        kind: ClaimOutcomeKind.Settled,
        result: {
          outcome: DispatchOutcome.DeadLetter,
          id: envelope.id,
          error: 'message id was already used with different content',
          code: MessagingErrorCode.IdempotencyConflict,
        },
      };
    }

    switch (result.state) {
      case ClaimState.Completed:
        return {
          kind: ClaimOutcomeKind.Settled,
          result: { outcome: DispatchOutcome.Duplicate, id: envelope.id },
        };
      case ClaimState.InProgress:
        return {
          kind: ClaimOutcomeKind.Settled,
          result: {
            outcome: DispatchOutcome.InProgress,
            id: envelope.id,
            delayMs: Math.max(
              0,
              result.leaseUntil - this.clock.now().getTime(),
            ),
          },
        };
      case ClaimState.Acquired:
        return {
          kind: ClaimOutcomeKind.Acquired,
          claim: { key, token: result.claimToken },
        };
    }
  }

  /** Saves the result with the claim token. */
  async complete(claim: AcquiredMessageClaim): Promise<void> {
    await this.store.complete(claim.key, claim.token, {
      processedAt: this.clock.now().getTime(),
    });
  }

  /**
   * Gives the claim back with its token. Best effort: never throws. If the
   * release fails (store down or expired token), the claim stays in
   * progress until its lease expires, which bounds how long it blocks redeliveries.
   * The lease bounds how long the claim can block.
   */
  async release(claim: AcquiredMessageClaim): Promise<void> {
    try {
      await this.store.release(claim.key, claim.token);
    } catch {}
  }
}
