import { GetUserAccessOperation } from '@contracts/identity';
import {
  AccessGrantSource,
  AuthenticationError,
  type AccessGrant,
} from '@platform/auth';
import type { InternalClient } from '@platform/internal-api';
import type { IdGenerator } from '@platform/kernel';
import { CallOutcomeKind } from '@platform/primitives';

/** El acceso de un usuario pedido a identity por la API interna, para los servicios que no son identity. */
export class InternalAccessGrantSource extends AccessGrantSource {
  constructor(
    private readonly client: InternalClient,
    private readonly ids: IdGenerator,
  ) {
    super();
  }

  /** @throws AuthenticationError `stateUnavailable` si identity no responde con el acceso. */
  async fetch(tenantId: string, userId: string): Promise<AccessGrant> {
    const outcome = await this.client.call(
      GetUserAccessOperation,
      { tenantId, userId },
      { idempotencyKey: this.ids.next().toString(), tenantId },
    );
    if (outcome.kind !== CallOutcomeKind.Success) {
      throw AuthenticationError.stateUnavailable(outcome);
    }
    const access = outcome.value;
    return {
      permissions: access.permissions,
      platformRoles: access.platformRoles,
      features: access.features,
      flags: access.flags,
      permissionVersion: access.permissionVersion,
    };
  }
}
