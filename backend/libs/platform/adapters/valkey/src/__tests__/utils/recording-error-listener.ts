/** Listens to the errors a channel reports and records them. */
export class RecordingErrorListener {
  readonly errors: unknown[] = [];

  /** What is passed as `onError`. */
  readonly report = (error: unknown): void => {
    this.errors.push(error);
  };
}
