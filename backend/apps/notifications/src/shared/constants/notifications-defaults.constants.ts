/** notifications default values. */
export const NotificationsDefaults = {
  inboxRetentionDays: 90,
  pageSize: 20,
  /** Attempts of an email or push delivery before giving it up as lost. */
  maxDeliveryAttempts: 5,
  defaultLocale: 'es',
  /** Without saved preferences there are no quiet hours. */
  quietStart: '00:00',
  quietEnd: '00:00',
  timezone: 'UTC',
} as const;
