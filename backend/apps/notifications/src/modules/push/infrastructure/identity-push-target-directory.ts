import { Injectable } from '@nestjs/common';
import { ListPushTargetsOperation, type PushTarget } from '@contracts/identity';
import type { UserRef } from '@contracts/platform';
import { InternalClient } from '@platform/internal-api';
import { IdGenerator } from '@platform/kernel';
import { CallOutcomeKind } from '@platform/primitives';
import { PushTargetDirectory } from '../domain/push-target-directory.js';
import { IdentityUnavailableError } from '../../../shared/errors/identity-unavailable.error.js';

/** Push-enabled devices through the `identity.devices.list-push-targets.v1` operation. */
@Injectable()
export class IdentityPushTargetDirectory extends PushTargetDirectory {
  constructor(
    private readonly client: InternalClient,
    private readonly ids: IdGenerator,
  ) {
    super();
  }

  /** @throws IdentityUnavailableError if identity does not respond: delivery is retried later. */
  override async targetsOf(user: UserRef): Promise<readonly PushTarget[]> {
    const outcome = await this.client.call(
      ListPushTargetsOperation,
      { user },
      {
        idempotencyKey: this.ids.next().toString(),
        tenantId: user.homeTenantId,
      },
    );
    if (outcome.kind !== CallOutcomeKind.Success) {
      throw new IdentityUnavailableError(
        ListPushTargetsOperation.id,
        outcome.kind,
      );
    }
    return outcome.value.targets;
  }
}
