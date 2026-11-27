/** Identity transactional email adapter. `memory` and `console` are only allowed with `DEPLOY_ENVIRONMENT=local`. */
export enum IdentityMailerKind {
  Memory = 'memory',
  Console = 'console',
  Notifications = 'notifications',
}
