import { Endpoint, Resource } from '@platform/http/nest';
import { SignInRoute } from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';

@Resource(IdentityResource.Authentication)
export class AuthenticationController {
  @Endpoint(SignInRoute)
  signIn(): never {
    throw new RouteNotImplementedError(SignInRoute.id);
  }
}
