import { Injectable } from '@nestjs/common';
import {
  ListMembersByPermissionOperation,
  type Permission,
} from '@contracts/identity';
import type { UserRef } from '@contracts/platform';
import { InternalClient } from '@platform/internal-api';
import { IdGenerator } from '@platform/kernel';
import { CallOutcomeKind } from '@platform/primitives';
import { IdentityUnavailableError } from '../../../shared/errors/identity-unavailable.error.js';
import { TenantMembers } from '../application/tenant-members.js';

/** Members through the paginated `identity.members.list-by-permission.v1` operation. */
@Injectable()
export class IdentityTenantMembers extends TenantMembers {
  constructor(
    private readonly client: InternalClient,
    private readonly ids: IdGenerator,
  ) {
    super();
  }

  /** @throws IdentityUnavailableError if identity does not respond for a page. */
  override async withPermission(
    tenantId: string,
    permission: Permission,
  ): Promise<readonly UserRef[]> {
    const members: UserRef[] = [];
    let after: string | undefined;
    do {
      const outcome = await this.client.call(
        ListMembersByPermissionOperation,
        { tenantId, permission, ...(after === undefined ? {} : { after }) },
        { idempotencyKey: this.ids.next().toString(), tenantId },
      );
      if (outcome.kind !== CallOutcomeKind.Success) {
        throw new IdentityUnavailableError(
          ListMembersByPermissionOperation.id,
          outcome.kind,
        );
      }
      members.push(...outcome.value.items);
      after = outcome.value.nextCursor ?? undefined;
    } while (after !== undefined);
    return members;
  }
}
