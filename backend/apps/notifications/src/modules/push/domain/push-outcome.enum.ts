/** What became of a push to one user. */
export enum PushOutcome {
  /** Handed to the provider for every registered device, or the user has none. */
  Sent = 'sent',
  /** The sender delivers nothing, so the user's devices were not reached. */
  Skipped = 'skipped',
}
