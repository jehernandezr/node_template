import { Endpoint, Resource } from '@platform/http/nest';
import {
  CreateTenantRoute,
  GetTenantRoute,
  UpdateTenantRoute,
  ListMyTenantsRoute,
  GetSagaRoute,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';

@Resource(IdentityResource.Tenants)
export class TenantsController {
  @Endpoint(CreateTenantRoute)
  createTenant(): never {
    throw new RouteNotImplementedError(CreateTenantRoute.id);
  }

  @Endpoint(GetTenantRoute)
  getTenant(): never {
    throw new RouteNotImplementedError(GetTenantRoute.id);
  }

  @Endpoint(UpdateTenantRoute)
  updateTenant(): never {
    throw new RouteNotImplementedError(UpdateTenantRoute.id);
  }

  @Endpoint(ListMyTenantsRoute)
  listMyTenants(): never {
    throw new RouteNotImplementedError(ListMyTenantsRoute.id);
  }

  @Endpoint(GetSagaRoute)
  getSaga(): never {
    throw new RouteNotImplementedError(GetSagaRoute.id);
  }
}
