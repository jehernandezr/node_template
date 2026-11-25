/** Consumer that can be polled with one round of long polling. */
export interface SingleBatchPoller {
  pollOnce(): Promise<unknown>;
}

/**
 * Repeats `pollOnce` until the condition holds. The number of rounds
 * is bounded: if the delivery does not arrive, the test fails instead of hanging.
 */
export class PollUntil {
  static readonly DEFAULT_MAX_POLLS = 20;

  static async run(
    poller: SingleBatchPoller,
    done: () => boolean,
    maxPolls = PollUntil.DEFAULT_MAX_POLLS,
  ): Promise<void> {
    let polls = 0;
    while (!done() && polls < maxPolls) {
      await poller.pollOnce();
      polls += 1;
    }
    if (!done()) {
      throw new Error(`the condition was not met after ${maxPolls} polls`);
    }
  }
}
