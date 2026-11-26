import { GetUserAccessOperation } from '@contracts/identity';
import {
  AccessGrantSource,
  AuthenticationError,
  type AccessGrant,
} from '@platform/auth';
import type { InternalClient } from '@platform/internal-api';
import type { IdGenerator } from '@platform/kernel';
import { CallOutcomeKind } from '@platform/primitives';

/** A user's access requested from identity through the internal API, for the services that are not identity. */
export class InternalAccessGrantSource extends AccessGrantSource {
  constructor(
    private readonly client: InternalClient,
    private readonly ids: IdGenerator,
  ) {
    super();
  }

  /** @throws AuthenticationError `stateUnavailable` if identity does not respond with the access. */
  override async fetch(tenantId: string, userId: string): Promise<AccessGrant> {
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
