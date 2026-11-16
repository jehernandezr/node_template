/** Cuenta los commits que avisa el bus del outbox. */
export class CommitCounter {
  count = 0;

  notify = (): void => {
    this.count += 1;
  };
}
