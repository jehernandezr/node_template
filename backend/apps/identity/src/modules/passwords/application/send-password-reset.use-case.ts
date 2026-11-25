import { Injectable } from '@nestjs/common';
import { UserStatus } from '@contracts/identity';
import { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';
import { IdentityMailer } from '../../alerts/index.js';
import { UsersFacade } from '../../users/index.js';
import { PasswordResetTokens } from './password-reset-tokens.js';

/**
 * Answers a queued password reset request in the worker: an account that can reset its password receives a
 * single-use token by email, and an unknown, suspended or deleted one receives nothing.
 */
@Injectable()
export class SendPasswordReset {
  private static readonly SILENT: ReadonlySet<UserStatus> = new Set([
    UserStatus.Suspended,
    UserStatus.Deleted,
  ]);

  constructor(
    private readonly users: UsersFacade,
    private readonly resets: PasswordResetTokens,
    private readonly mailer: IdentityMailer,
  ) {}

  /**
   * Sends the reset email to the account of the email, if it can reset its password.
   * @param email Email of the request.
   * @throws NotificationsUnavailableError if notifications does not take the email; the request is retried.
   */
  async execute(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (user === undefined || SendPasswordReset.SILENT.has(user.status)) {
      return;
    }
    const token = await this.resets.issue({
      userId: user.id,
      homeTenantId: user.homeTenantId,
    });
    await this.mailer.send({
      template: IdentityEmailTemplate.PasswordReset,
      to: user.email,
      locale: user.locale,
      variables: { token },
    });
  }
}
