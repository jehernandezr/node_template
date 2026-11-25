/** Contadores que publica cada pasada del relay del outbox, uno por campo de `RelayReport`. */
export enum OutboxMetric {
  Published = 'messaging.outbox.published',
  Failed = 'messaging.outbox.failed',
  Dead = 'messaging.outbox.dead',
  Deferred = 'messaging.outbox.deferred',
  Stale = 'messaging.outbox.stale',
}
