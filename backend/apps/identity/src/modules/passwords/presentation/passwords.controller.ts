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
import { requireUserActor } from '../../../shared/utils/user-actor.js';
import { ChangePassword } from '../application/change-password.use-case.js';
import { ConfirmPasswordReset } from '../application/confirm-password-reset.use-case.js';
import { RequestPasswordReset } from '../application/request-password-reset.use-case.js';

@Resource(IdentityResource.Passwords)
export class PasswordsController {
  constructor(
    private readonly change: ChangePassword,
    private readonly request: RequestPasswordReset,
    private readonly confirm: ConfirmPasswordReset,
  ) {}

  @Endpoint(ChangePasswordRoute)
  async changePassword(
    @Input() input: ChangePasswordRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.change.execute(requireUserActor(actor), input);
  }

  @Endpoint(RequestPasswordResetRoute)
  async requestPasswordReset(
    @Input() input: PasswordResetRequest,
  ): Promise<void> {
    await this.request.execute(input.email);
  }

  @Endpoint(ConfirmPasswordResetRoute)
  async confirmPasswordReset(
    @Input() input: PasswordResetConfirmRequest,
  ): Promise<void> {
    await this.confirm.execute(input);
  }
}
