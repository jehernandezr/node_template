import { Injectable } from '@nestjs/common';
import { RandomSource } from '@platform/kernel';
import {
  Backoff,
  BackoffStrategy,
  RetryPolicy,
  TimerScheduler,
} from '@platform/primitives';
import { SendEmail } from '../application/send-email.use-case.js';
import { LedgerRetryWait } from '../domain/ledger-retry-wait.js';

/** Exponential wait with equal jitter between ledger tries: half a second to the first retry, one to the second. */
@Injectable()
export class BackoffLedgerRetryWait extends LedgerRetryWait {
  static readonly BASE_DELAY_MS = 500;
  static readonly MAX_DELAY_MS = 2_000;
  static readonly POLICY = new RetryPolicy(
    SendEmail.RECORD_ATTEMPTS,
    BackoffLedgerRetryWait.BASE_DELAY_MS,
    BackoffLedgerRetryWait.MAX_DELAY_MS,
    BackoffStrategy.EqualJitter,
  );

  private readonly backoff: Backoff;

  constructor(random: RandomSource) {
    super();
    this.backoff = new Backoff(BackoffLedgerRetryWait.POLICY, random);
  }

  /**
   * Waits the backoff delay of the retry on a timer.
   * @param retry Number of the retry about to run, starting at 1.
   * @returns Resolves once the delay has elapsed.
   */
  override before(retry: number): Promise<void> {
    const delayMs = this.backoff.delay(retry);
    return new Promise((resolve) => {
      TimerScheduler.arm(delayMs, resolve);
    });
  }
}
