import { Endpoint, Resource } from '@platform/http/nest';
import {
  SignUpRoute,
  ResendEmailVerificationRoute,
  ConfirmEmailVerificationRoute,
  GetProfileRoute,
  UpdateProfileRoute,
  RequestEmailChangeRoute,
  ConfirmEmailChangeRoute,
  StartAccountDeletionRoute,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';

@Resource(IdentityResource.Users)
export class UsersController {
  @Endpoint(SignUpRoute)
  signUp(): never {
    throw new RouteNotImplementedError(SignUpRoute.id);
  }

  @Endpoint(ResendEmailVerificationRoute)
  resendEmailVerification(): never {
    throw new RouteNotImplementedError(ResendEmailVerificationRoute.id);
  }

  @Endpoint(ConfirmEmailVerificationRoute)
  confirmEmailVerification(): never {
    throw new RouteNotImplementedError(ConfirmEmailVerificationRoute.id);
  }

  @Endpoint(GetProfileRoute)
  getProfile(): never {
    throw new RouteNotImplementedError(GetProfileRoute.id);
  }

  @Endpoint(UpdateProfileRoute)
  updateProfile(): never {
    throw new RouteNotImplementedError(UpdateProfileRoute.id);
  }

  @Endpoint(RequestEmailChangeRoute)
  requestEmailChange(): never {
    throw new RouteNotImplementedError(RequestEmailChangeRoute.id);
  }

  @Endpoint(ConfirmEmailChangeRoute)
  confirmEmailChange(): never {
    throw new RouteNotImplementedError(ConfirmEmailChangeRoute.id);
  }

  @Endpoint(StartAccountDeletionRoute)
  startAccountDeletion(): never {
    throw new RouteNotImplementedError(StartAccountDeletionRoute.id);
  }
}
