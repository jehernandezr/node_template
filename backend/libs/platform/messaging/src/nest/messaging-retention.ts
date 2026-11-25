/** How long finished items are kept before the retention jobs delete them. */
export interface MessagingRetention {
  /** Published outbox records. Defaults to 7 days. */
  readonly outboxMs?: number;
  /**
   * Processed messages. Must exceed the maximum queue retention (14 days in
   * SQS) so a late duplicate is not processed again. Defaults to 30 days.
   */
  readonly processedMs?: number;
}
