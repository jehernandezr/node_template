import { Endpoint, Resource } from '@platform/http/nest';
import {
  RefreshSessionRoute,
  SignOutRoute,
  ListSessionsRoute,
  RevokeSessionRoute,
  RevokeOtherSessionsRoute,
  SwitchTenantRoute,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';

@Resource(IdentityResource.Sessions)
export class SessionsController {
  @Endpoint(RefreshSessionRoute)
  refreshSession(): never {
    throw new RouteNotImplementedError(RefreshSessionRoute.id);
  }

  @Endpoint(SignOutRoute)
  signOut(): never {
    throw new RouteNotImplementedError(SignOutRoute.id);
  }

  @Endpoint(ListSessionsRoute)
  listSessions(): never {
    throw new RouteNotImplementedError(ListSessionsRoute.id);
  }

  @Endpoint(RevokeSessionRoute)
  revokeSession(): never {
    throw new RouteNotImplementedError(RevokeSessionRoute.id);
  }

  @Endpoint(RevokeOtherSessionsRoute)
  revokeOtherSessions(): never {
    throw new RouteNotImplementedError(RevokeOtherSessionsRoute.id);
  }

  @Endpoint(SwitchTenantRoute)
  switchTenant(): never {
    throw new RouteNotImplementedError(SwitchTenantRoute.id);
  }
}
