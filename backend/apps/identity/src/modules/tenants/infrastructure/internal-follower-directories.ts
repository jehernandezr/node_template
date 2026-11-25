import { Injectable } from '@nestjs/common';
import type { TenantDirectoryEntry } from '@contracts/platform';
import { InternalClient } from '@platform/internal-api';
import { IdGenerator } from '@platform/kernel';
import { CallOutcomeKind } from '@platform/primitives';
import { FollowerDirectoryUnavailableError } from '../../../shared/errors/follower-directory-unavailable.error.js';
import { TenantDirectoryFollowers } from '../application/tenant-directory-followers.js';
import { FollowerDirectories } from '../domain/follower-directories.js';

/** Ubica el tenant en el directorio de cada servicio por su operación interna, uno tras otro. */
@Injectable()
export class InternalFollowerDirectories extends FollowerDirectories {
  constructor(
    private readonly client: InternalClient,
    private readonly ids: IdGenerator,
  ) {
    super();
  }

  async place(entry: TenantDirectoryEntry): Promise<void> {
    for (const follower of TenantDirectoryFollowers.ALL) {
      const operation = follower.tenantDirectoryPlace;
      const outcome = await this.client.call(operation, entry, {
        idempotencyKey: this.ids.next().toString(),
      });
      if (outcome.kind !== CallOutcomeKind.Success) {
        throw new FollowerDirectoryUnavailableError(operation.id, outcome.kind);
      }
    }
  }
}
