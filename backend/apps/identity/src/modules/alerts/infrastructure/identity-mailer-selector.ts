import { IdentityMailerKind } from '../../../config/identity-mailer-kind.enum.js';
import type { IdentityMailer } from '../domain/identity-mailer.js';

/** Picks the mailer that `IDENTITY_MAILER` asks for among the ones the module built. */
export class IdentityMailerSelector {
  constructor(
    private readonly memory: IdentityMailer,
    private readonly console: IdentityMailer,
    private readonly notifications: IdentityMailer,
  ) {}

  /**
   * The mailer of the configured kind.
   * @param kind Configured mailer kind.
   * @returns The mailer to inject.
   */
  select(kind: IdentityMailerKind): IdentityMailer {
    switch (kind) {
      case IdentityMailerKind.Memory:
        return this.memory;
      case IdentityMailerKind.Console:
        return this.console;
      case IdentityMailerKind.Notifications:
        return this.notifications;
    }
  }
}
