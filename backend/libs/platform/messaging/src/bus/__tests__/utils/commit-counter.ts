/** Counts the commits the outbox bus reports. */
export class CommitCounter {
  count = 0;

  notify = (): void => {
    this.count += 1;
  };
}
