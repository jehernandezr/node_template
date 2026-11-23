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
import { TenantOnboardingSaga } from './tenant-onboarding.saga.js';

/**
 * `POST /v1/tenants`: ubica al tenant en un shard de su región (ahí vive la bitácora de la saga) y arranca
 * `TenantOnboarding`, cuyo primer paso reserva el slug con su reversa. Así ninguna caída deja un slug tomado
 * sin una saga que lo libere. El tenant queda en aprovisionamiento hasta que la saga lo activa; el cliente
 * sigue su avance con `GET /v1/sagas/{sagaId}`.
 */
@Injectable()
export class StartTenantOnboarding {
  constructor(
    private readonly directory: TenantDirectory,
    private readonly placement: TenantPlacement,
    private readonly sagas: IdentitySagas,
    private readonly ids: IdGenerator,
    private readonly settings: IdentitySettings,
  ) {}

  /**
   * Un slug tomado se rechaza de una vez; si otro alta lo toma en el mismo instante, la saga termina
   * compensada.
   * @throws IdentityError `IDENTITY.TENANT.SLUG_TAKEN` si el slug ya es de otro tenant.
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
    await this.placement.place(tenantId, region, false);
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
      },
    });
    return { tenantId, sagaId };
  }
}
