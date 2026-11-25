import { FixedRandomSource } from '@platform/kernel/test-utils';
import { BackoffLedgerRetryWait } from '../backoff-ledger-retry-wait.js';

class WaitProbe {
  resolved = false;

  constructor(wait: Promise<void>) {
    void wait.then(() => {
      this.resolved = true;
    });
  }
}

describe('BackoffLedgerRetryWait', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    { retry: 1, delayMs: 375 },
    { retry: 2, delayMs: 750 },
  ])(
    'waits $delayMs ms before retry $retry with the jitter at its midpoint',
    async ({ retry, delayMs }) => {
      const wait = new BackoffLedgerRetryWait(new FixedRandomSource([0.5]));

      const probe = new WaitProbe(wait.before(retry));

      await jest.advanceTimersByTimeAsync(delayMs - 1);
      expect(probe.resolved).toBe(false);
      await jest.advanceTimersByTimeAsync(1);
      expect(probe.resolved).toBe(true);
    },
  );
});
