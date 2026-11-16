import { Endpoint, Resource } from '@platform/http/nest';
import {
  ListServiceAccountsRoute,
  CreateServiceAccountRoute,
  UpdateServiceAccountRoute,
  DeleteServiceAccountRoute,
  ListApiKeysRoute,
  CreateApiKeyRoute,
  RotateApiKeyRoute,
  RevokeApiKeyRoute,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';

@Resource(IdentityResource.ApiKeys)
export class ApiKeysController {
  @Endpoint(ListServiceAccountsRoute)
  listServiceAccounts(): never {
    throw new RouteNotImplementedError(ListServiceAccountsRoute.id);
  }

  @Endpoint(CreateServiceAccountRoute)
  createServiceAccount(): never {
    throw new RouteNotImplementedError(CreateServiceAccountRoute.id);
  }

  @Endpoint(UpdateServiceAccountRoute)
  updateServiceAccount(): never {
    throw new RouteNotImplementedError(UpdateServiceAccountRoute.id);
  }

  @Endpoint(DeleteServiceAccountRoute)
  deleteServiceAccount(): never {
    throw new RouteNotImplementedError(DeleteServiceAccountRoute.id);
  }

  @Endpoint(ListApiKeysRoute)
  listApiKeys(): never {
    throw new RouteNotImplementedError(ListApiKeysRoute.id);
  }

  @Endpoint(CreateApiKeyRoute)
  createApiKey(): never {
    throw new RouteNotImplementedError(CreateApiKeyRoute.id);
  }

  @Endpoint(RotateApiKeyRoute)
  rotateApiKey(): never {
    throw new RouteNotImplementedError(RotateApiKeyRoute.id);
  }

  @Endpoint(RevokeApiKeyRoute)
  revokeApiKey(): never {
    throw new RouteNotImplementedError(RevokeApiKeyRoute.id);
  }
}
