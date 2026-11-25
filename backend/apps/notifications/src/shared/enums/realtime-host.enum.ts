/** Where the real-time connections of notifications are served. */
export enum RealtimeHost {
  /** Inside notifications, next to its API. */
  Service = 'service',
  /** In `apps/realtime`: notifications only publishes to the stream. */
  App = 'app',
}
