import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  IdentitySaga,
  type CreateTenantRequest,
  type TenantCreation,
} from '@contracts/identity';
import { IdGenerator } from '@platform/kernel';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { IdentitySagas } from '../../sagas/index.js';
import { TenantDirectory } from '../domain/tenant-directory.js';
import { TenantPlacement } from '../domain/tenant-placement.js';
import { TenantDirectoryEntryFactory } from './tenant-directory-entry.factory.js';
import { TenantOnboardingSaga } from './tenant-onboarding.saga.js';

/**
 * `POST /v1/tenants`: places the tenant in a shard of its region (the saga's log lives there) and starts
 * `TenantOnboarding` with that placement, which the saga carries to the other services. Its first step reserves the slug with its
 * reversal. This way no crash leaves a slug taken
 * without a saga that releases it. The tenant stays in provisioning until the saga activates it; the client
 * follows its progress with `GET /v1/sagas/{sagaId}`.
 */
@Injectable()
export class StartTenantOnboarding {
  constructor(
    private readonly directory: TenantDirectory,
    private readonly placement: TenantPlacement,
    private readonly entries: TenantDirectoryEntryFactory,
    private readonly sagas: IdentitySagas,
    private readonly ids: IdGenerator,
    private readonly settings: IdentitySettings,
  ) {}

  /**
   * A taken slug is rejected right away; if another creation takes it at the same instant, the saga ends
   * compensated.
   * @throws IdentityError `IDENTITY.TENANT.SLUG_TAKEN` if the slug already belongs to another tenant.
   */
  async execute(
    owner: UserRef,
    request: CreateTenantRequest,
  ): Promise<TenantCreation> {
    const tenantId = this.ids.next().toString();
    const sagaId = this.ids.next().toString();
    const region = request.region ?? this.settings.values.IDENTITY_REGION;
    if (await this.directory.isTaken(request.slug)) {
      throw new IdentityError(IdentityErrorCode.TenantSlugTaken);
    }
    const placed = await this.placement.place(tenantId, region, false);
    await this.sagas.start({
      definition: TenantOnboardingSaga,
      saga: IdentitySaga.TenantOnboarding,
      sagaId,
      tenantId,
      requestedBy: owner.userId,
      state: {
        tenantId,
        slug: request.slug,
        name: request.name,
        region,
        owner,
        welcomeId: this.ids.next().toString(),
        directory: this.entries.of(tenantId, placed),
      },
    });
    return { tenantId, sagaId };
  }
}
