import { Endpoint, Resource } from '@platform/http/nest';
import { GetJwksRoute } from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';

@Resource(IdentityResource.Tokens)
export class TokensController {
  @Endpoint(GetJwksRoute)
  getJwks(): never {
    throw new RouteNotImplementedError(GetJwksRoute.id);
  }
}
