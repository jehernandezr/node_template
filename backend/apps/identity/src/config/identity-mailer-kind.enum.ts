/** Identity transactional email adapter. `console` exists only in development. */
export enum IdentityMailerKind {
  Memory = 'memory',
  Console = 'console',
  Notifications = 'notifications',
}
