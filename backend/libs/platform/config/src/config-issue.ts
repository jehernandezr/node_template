export interface ConfigIssue {
  /** Dotted path to the invalid key, for example `LOG_SAMPLE_RATE`. `(root)` if the whole value is rejected. */
  readonly path: string;
  readonly code: string;
  /** Validator message. Never includes the received value. */
  readonly message: string;
}
