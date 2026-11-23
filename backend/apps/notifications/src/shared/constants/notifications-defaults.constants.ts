/** Valores por defecto de notifications. */
export const NotificationsDefaults = {
  inboxRetentionDays: 90,
  pageSize: 20,
  /** Intentos de una entrega por correo o push antes de darla por perdida. */
  maxDeliveryAttempts: 5,
  defaultLocale: 'es',
  /** Sin preferencias guardadas no hay horario de silencio. */
  quietStart: '00:00',
  quietEnd: '00:00',
  timezone: 'UTC',
} as const;
