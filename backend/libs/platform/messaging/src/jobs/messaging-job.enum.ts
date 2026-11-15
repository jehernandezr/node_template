/** Nombres de los jobs programados de messaging. */
export enum MessagingJob {
  OutboxRelay = 'messaging.outbox-relay',
  OutboxRetention = 'messaging.outbox-retention',
  ProcessedMessageRetention = 'messaging.processed-message-retention',
}
