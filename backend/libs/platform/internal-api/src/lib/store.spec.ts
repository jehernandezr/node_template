import { ClaimState, InMemoryProcessedOperationStore } from './store.js';
import { ResultKind } from './result.js';

const request = (now: number, inputHash = 'h1') => ({
  inputHash,
  leaseMs: 100,
  now,
});

describe('InMemoryProcessedOperationStore', () => {
  it('acquires a fresh key once and reports in-progress while the lease holds', async () => {
    const store = new InMemoryProcessedOperationStore();
    await expect(store.claim('k', request(0))).resolves.toEqual({
      state: ClaimState.Acquired,
      inputHash: 'h1',
    });
    await expect(store.claim('k', request(50))).resolves.toEqual({
      state: ClaimState.InProgress,
      inputHash: 'h1',
    });
  });

  it('lets an expired lease be re-acquired, keeping the first input hash', async () => {
    const store = new InMemoryProcessedOperationStore();
    await store.claim('k', request(0));
    await expect(store.claim('k', request(200, 'other'))).resolves.toEqual({
      state: ClaimState.Acquired,
      inputHash: 'h1',
    });
  });

  it('returns the completed result to later claims', async () => {
    const store = new InMemoryProcessedOperationStore();
    await store.claim('k', request(0));
    await store.complete('k', { kind: ResultKind.Success, value: 1 });
    await expect(store.claim('k', request(1))).resolves.toEqual({
      state: ClaimState.Completed,
      inputHash: 'h1',
      result: { kind: ResultKind.Success, value: 1 },
    });
  });

  it('release frees an in-progress claim but never a completed one', async () => {
    const store = new InMemoryProcessedOperationStore();
    await store.claim('k', request(0));
    await store.release('k');
    await expect(store.claim('k', request(1))).resolves.toMatchObject({
      state: ClaimState.Acquired,
    });

    await store.complete('k', { kind: ResultKind.Success, value: 2 });
    await store.release('k');
    await expect(store.claim('k', request(2))).resolves.toMatchObject({
      state: ClaimState.Completed,
    });
  });

  it('rejects complete without a claim', async () => {
    const store = new InMemoryProcessedOperationStore();
    await expect(
      store.complete('missing', { kind: ResultKind.Success, value: 1 }),
    ).rejects.toThrow(/without a claim/);
  });

  it('resolves concurrent claims on one key to exactly one Acquired', async () => {
    const store = new InMemoryProcessedOperationStore();
    const outcomes = await Promise.all([
      store.claim('k', request(0)),
      store.claim('k', request(0)),
      store.claim('k', request(0)),
    ]);
    expect(
      outcomes.filter((o) => o.state === ClaimState.Acquired),
    ).toHaveLength(1);
    expect(
      outcomes.filter((o) => o.state === ClaimState.InProgress),
    ).toHaveLength(2);
  });
});
