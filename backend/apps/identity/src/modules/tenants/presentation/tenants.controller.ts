import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import type { Actor } from '@platform/auth';
import {
  CreateTenantRoute,
  GetTenantRoute,
  UpdateTenantRoute,
  ListMyTenantsRoute,
  type CreateTenantRequest,
  type MyTenantPage,
  type TenantCreation,
  type TenantSummary,
  type UpdateTenantRequest,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import {
  requireUserActor,
  userRefOf,
} from '../../../shared/utils/user-actor.js';
import { ListMyTenants } from '../application/list-my-tenants.use-case.js';
import { StartTenantOnboarding } from '../application/start-tenant-onboarding.use-case.js';
import { TenantReader } from '../application/tenant-reader.js';
import { TenantSummaryView } from '../application/tenant-summary-view.js';
import { UpdateTenant } from '../application/update-tenant.use-case.js';

@Resource(IdentityResource.Tenants)
export class TenantsController {
  constructor(
    private readonly reader: TenantReader,
    private readonly update: UpdateTenant,
    private readonly mine: ListMyTenants,
    private readonly onboarding: StartTenantOnboarding,
  ) {}

  @Endpoint(CreateTenantRoute)
  createTenant(
    @Input() input: CreateTenantRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<TenantCreation> {
    return this.onboarding.execute(userRefOf(requireUserActor(actor)), input);
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
}
