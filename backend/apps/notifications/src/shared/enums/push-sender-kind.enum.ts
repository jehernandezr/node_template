/** `PushSender` adapter chosen by `NOTIFICATIONS_PUSH_SENDER`. APNs, FCM and Web Push require their own accounts. */
export enum PushSenderKind {
  Memory = 'memory',
  /** Delivers nothing: every push is recorded as skipped (ADR 0046). */
  None = 'none',
}
