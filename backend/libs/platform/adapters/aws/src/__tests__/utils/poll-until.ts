/** Consumidor que se puede sondear con una vuelta de long polling. */
export interface SingleBatchPoller {
  pollOnce(): Promise<unknown>;
}

/**
 * Repite `pollOnce` hasta que se cumpla la condición. El número de vueltas
 * está acotado: si la entrega no llega, la prueba falla en vez de colgarse.
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
