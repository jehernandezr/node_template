import { FailureKind } from '@platform/kernel';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import {
  CallOutcome,
  CallOutcomeKind,
  CallOutcomeFactory,
  Deadline,
  FailureClassifier,
  StaleClaimError,
} from '@platform/primitives';
import { InternalApiReason } from '../../contract/internal-api-reason.enum.js';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { GateDecisionKind, type GateDecision } from '../gate-decision.js';
import { IdempotencyGate } from '../idempotency-gate.js';
import { FailingProcessedOperationStore } from './utils/failing-processed-operation-store.js';
import { RecordingProcessedOperationStore } from './utils/recording-processed-operation-store.js';

const START = new Date('2026-01-01T00:00:00.000Z');

function setup(options: { leaseMarginMs?: number; minLeaseMs?: number } = {}) {
  const clock = new FixedClock(START);
  const store = new RecordingProcessedOperationStore(
    clock,
    new SequentialIdGenerator(),
  );
  const outcomes = new CallOutcomeFactory(new FailureClassifier());
  const gate = new IdempotencyGate(store, outcomes, options);
  return { clock, store, outcomes, gate };
}

/** Obtiene el claim de una decisión `Proceed`; falla la prueba si la decisión no es esa. */
function claimedOf(decision: GateDecision) {
  if (decision.kind !== GateDecisionKind.Proceed) {
    throw new Error('expected Proceed');
  }
  return decision.claimed;
}

const RESULT = CallOutcome.success({ reservationId: 'r-1' });

describe('IdempotencyGate', () => {
  it('claim, free key, answers proceed with the claim', async () => {
    const { clock, gate } = setup();

    const decision = await gate.claim('k', 'fp', Deadline.after(1000, clock));

    expect(decision.kind).toBe(GateDecisionKind.Proceed);
  });

  it('claim, key in progress, answers transient-failure in-progress', async () => {
    const { clock, gate } = setup();
    await gate.claim('k', 'fp', Deadline.after(1000, clock));

    const second = await gate.claim('k', 'fp', Deadline.after(1000, clock));

    expect(second).toEqual({
      kind: GateDecisionKind.Respond,
      outcome: CallOutcome.transientFailure(InternalApiReason.InProgress),
    });
  });

  it('claim, completed key, answers the stored result', async () => {
    const { clock, gate } = setup();
    const claimed = claimedOf(
      await gate.claim('k', 'fp', Deadline.after(1000, clock)),
    );
    await gate.complete(claimed, RESULT);

    const again = await gate.claim('k', 'fp', Deadline.after(1000, clock));

    expect(again).toEqual({ kind: GateDecisionKind.Respond, outcome: RESULT });
  });

  it('claim, same key with another fingerprint, answers idempotency-key-reuse', async () => {
    const { clock, gate } = setup();
    await gate.claim('k', 'fp', Deadline.after(1000, clock));

    const reused = await gate.claim('k', 'other', Deadline.after(1000, clock));

    expect(reused).toEqual({
      kind: GateDecisionKind.Respond,
      outcome: CallOutcome.protocolViolation(
        InternalApiReason.IdempotencyKeyReuse,
        InternalApiErrorCode.IdempotencyKeyReuse,
      ),
    });
  });

  it('claim, takeover with another fingerprint, releases the taken claim', async () => {
    const { clock, gate } = setup();
    await gate.claim('k', 'fp', Deadline.after(1000, clock));
    clock.advance(6_001);
    const takeover = await gate.claim(
      'k',
      'other',
      Deadline.after(1000, clock),
    );

    expect(takeover.kind).toBe(GateDecisionKind.Respond);
    const retry = await gate.claim('k', 'fp', Deadline.after(1000, clock));
    expect(retry.kind).toBe(GateDecisionKind.Proceed);
  });

  it('claim, expired lease, lets another attempt take the key and fences the old token', async () => {
    const { clock, gate } = setup();
    const slow = claimedOf(
      await gate.claim('k', 'fp', Deadline.after(1000, clock)),
    );
    clock.advance(6_001);

    const fast = claimedOf(
      await gate.claim('k', 'fp', Deadline.after(1000, clock)),
    );

    expect(fast.claimToken).not.toBe(slow.claimToken);
    await expect(gate.complete(slow, RESULT)).rejects.toBeInstanceOf(
      StaleClaimError,
    );
  });

  it('release, stale token, resolves without throwing', async () => {
    const { clock, gate } = setup();
    const slow = claimedOf(
      await gate.claim('k', 'fp', Deadline.after(1000, clock)),
    );
    clock.advance(6_001);
    await gate.claim('k', 'fp', Deadline.after(1000, clock));

    await expect(gate.release(slow)).resolves.toBeUndefined();
  });

  it('claim, store throws, answers the outcome of the error', async () => {
    const clock = new FixedClock(START);
    const store = new FailingProcessedOperationStore(
      clock,
      new SequentialIdGenerator(),
    ).failClaim(
      Object.assign(new Error('terminating connection'), {
        code: '57P01',
        failureKind: FailureKind.Transient,
      }),
    );
    const gate = new IdempotencyGate(
      store,
      new CallOutcomeFactory(new FailureClassifier()),
    );

    const decision = await gate.claim('k', 'fp', Deadline.after(1000, clock));

    expect(decision).toMatchObject({
      kind: GateDecisionKind.Respond,
      outcome: { kind: CallOutcomeKind.TransientFailure, reason: '57P01' },
    });
  });

  it('claim, lease options, passes them to the store', async () => {
    const { clock, store, gate } = setup({
      leaseMarginMs: 250,
      minLeaseMs: 100,
    });

    await gate.claim('k', 'fp', Deadline.after(1000, clock));

    expect(store.claims[0]?.request).toMatchObject({
      leaseMarginMs: 250,
      minLeaseMs: 100,
    });
  });
});
