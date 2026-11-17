import { Injectable } from '@nestjs/common';
import { UserStatus } from '@contracts/identity';
import { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';
import { IdentityMailer } from '../../alerts/index.js';
import { UsersFacade } from '../../users/index.js';
import { PasswordResetTokens } from './password-reset-tokens.js';

/** Envía el enlace de recuperación. Responde igual exista o no la cuenta. */
@Injectable()
export class RequestPasswordReset {
  constructor(
    private readonly users: UsersFacade,
    private readonly resets: PasswordResetTokens,
    private readonly mailer: IdentityMailer,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (user === undefined || user.status === UserStatus.Suspended) {
      return;
    }
    const token = await this.resets.issue({
      userId: user.id,
      homeTenantId: user.homeTenantId,
    });
    await this.mailer.send(IdentityEmailTemplate.PasswordReset, user.email, {
      token,
    });
  }
}
