/** Counters each outbox relay pass publishes, one per `RelayReport` field. */
export enum OutboxMetric {
  Published = 'messaging.outbox.published',
  Failed = 'messaging.outbox.failed',
  Dead = 'messaging.outbox.dead',
  Deferred = 'messaging.outbox.deferred',
  Stale = 'messaging.outbox.stale',
}
