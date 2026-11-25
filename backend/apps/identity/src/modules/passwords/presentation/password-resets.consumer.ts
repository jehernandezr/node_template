import { Injectable } from '@nestjs/common';
import {
  SendPasswordResetCommand,
  type PasswordResetRequest,
} from '@contracts/identity';
import { Subscribe } from '@platform/messaging/nest';
import { SendPasswordReset } from '../application/send-password-reset.use-case.js';

/**
 * Queue `identity-password-resets`: the password reset requests identity sends to itself. A redelivery may send
 * a second email with another token; each token works once and expires on its own.
 */
@Injectable()
export class PasswordResetsConsumer {
  constructor(private readonly sendReset: SendPasswordReset) {}

  /**
   * Sends the reset email of a queued request.
   * @param data Queued request.
   */
  @Subscribe(SendPasswordResetCommand)
  onSendPasswordReset(data: PasswordResetRequest): Promise<void> {
    return this.sendReset.execute(data.email);
  }
}
