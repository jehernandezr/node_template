import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import type { Actor } from '@platform/auth';
import {
  CreateTenantRoute,
  GetTenantRoute,
  UpdateTenantRoute,
  ListMyTenantsRoute,
  GetSagaRoute,
  type MyTenantPage,
  type TenantSummary,
  type UpdateTenantRequest,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';
import {
  requireUserActor,
  userRefOf,
} from '../../../shared/utils/user-actor.js';
import { ListMyTenants } from '../application/list-my-tenants.use-case.js';
import { TenantReader } from '../application/tenant-reader.js';
import { TenantSummaryView } from '../application/tenant-summary-view.js';
import { UpdateTenant } from '../application/update-tenant.use-case.js';

@Resource(IdentityResource.Tenants)
export class TenantsController {
  constructor(
    private readonly reader: TenantReader,
    private readonly update: UpdateTenant,
    private readonly mine: ListMyTenants,
  ) {}

  /** El alta pública corre la saga `TenantOnboarding`, que llega con su ciclo. */
  @Endpoint(CreateTenantRoute)
  createTenant(): never {
    throw new RouteNotImplementedError(CreateTenantRoute.id);
  }

  @Endpoint(GetTenantRoute)
  async getTenant(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<TenantSummary> {
    const user = requireUserActor(actor);
    return TenantSummaryView.summary(await this.reader.get(user.tenantId));
  }

  @Endpoint(UpdateTenantRoute)
  updateTenant(
    @Input() input: UpdateTenantRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<TenantSummary> {
    return this.update.execute(requireUserActor(actor).tenantId, input);
  }

  @Endpoint(ListMyTenantsRoute)
  listMyTenants(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<MyTenantPage> {
    return this.mine.execute(userRefOf(requireUserActor(actor)));
  }

  /** La consulta de sagas llega con las sagas de identity. */
  @Endpoint(GetSagaRoute)
  getSaga(): never {
    throw new RouteNotImplementedError(GetSagaRoute.id);
  }
}
