import { ActingUser } from '@platform/auth';
import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import type { Actor } from '@platform/auth';
import {
  ChangePasswordRoute,
  RequestPasswordResetRoute,
  ConfirmPasswordResetRoute,
  type ChangePasswordRequest,
  type PasswordResetConfirmRequest,
  type PasswordResetRequest,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { ChangePassword } from '../application/change-password.use-case.js';
import { ConfirmPasswordReset } from '../application/confirm-password-reset.use-case.js';
import { RequestPasswordReset } from '../application/request-password-reset.use-case.js';

/** HTTP routes of password change and reset. */
@Resource(IdentityResource.Passwords)
export class PasswordsController {
  constructor(
    private readonly change: ChangePassword,
    private readonly request: RequestPasswordReset,
    private readonly confirm: ConfirmPasswordReset,
  ) {}

  /**
   * Changes the signed-in user's password.
   * @param input Current and new password.
   * @param actor Signed-in user.
   */
  @Endpoint(ChangePasswordRoute)
  async changePassword(
    @Input() input: ChangePasswordRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.change.execute(ActingUser.of(actor), input);
  }

  /**
   * Requests a reset link for an email; answers the same whether or not the account exists.
   * @param input Email.
   */
  @Endpoint(RequestPasswordResetRoute)
  async requestPasswordReset(
    @Input() input: PasswordResetRequest,
  ): Promise<void> {
    await this.request.execute(input.email);
  }

  /**
   * Sets a new password with a reset token and revokes the user's sessions.
   * @param input Token and new password.
   */
  @Endpoint(ConfirmPasswordResetRoute)
  async confirmPasswordReset(
    @Input() input: PasswordResetConfirmRequest,
  ): Promise<void> {
    await this.confirm.execute(input);
  }
}
