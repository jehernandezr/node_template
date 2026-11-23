/** Dónde se atienden las conexiones de tiempo real de las notificaciones. */
export enum RealtimeHost {
  /** Dentro de notifications, junto a su API. */
  Service = 'service',
  /** En `apps/realtime`: notifications solo publica en el stream. */
  App = 'app',
}
