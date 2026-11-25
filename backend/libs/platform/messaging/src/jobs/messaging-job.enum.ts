/** Names of the messaging scheduled jobs. */
export enum MessagingJob {
  OutboxRelay = 'messaging.outbox-relay',
  OutboxRetention = 'messaging.outbox-retention',
  ProcessedMessageRetention = 'messaging.processed-message-retention',
}
