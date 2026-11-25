/** Pause between two tries of writing to the email ledger, so a short ledger outage does not use up every try. */
export abstract class LedgerRetryWait {
  /**
   * Waits before a retry of a ledger write.
   * @param retry Number of the retry about to run, starting at 1 for the second try.
   * @returns Resolves once the retry may run.
   */
  abstract before(retry: number): Promise<void>;
}
