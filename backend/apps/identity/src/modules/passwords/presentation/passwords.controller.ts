import { Endpoint, Resource } from '@platform/http/nest';
import {
  ChangePasswordRoute,
  RequestPasswordResetRoute,
  ConfirmPasswordResetRoute,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';

@Resource(IdentityResource.Passwords)
export class PasswordsController {
  @Endpoint(ChangePasswordRoute)
  changePassword(): never {
    throw new RouteNotImplementedError(ChangePasswordRoute.id);
  }

  @Endpoint(RequestPasswordResetRoute)
  requestPasswordReset(): never {
    throw new RouteNotImplementedError(RequestPasswordResetRoute.id);
  }

  @Endpoint(ConfirmPasswordResetRoute)
  confirmPasswordReset(): never {
    throw new RouteNotImplementedError(ConfirmPasswordResetRoute.id);
  }
}
