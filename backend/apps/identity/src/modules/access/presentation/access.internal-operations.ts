import { Injectable } from '@nestjs/common';
import { InternalHandler } from '@platform/internal-api/nest';
import type { HandlerResult } from '@platform/internal-api';
import { CallOutcome } from '@platform/primitives';
import {
  GetUserAccessOperation,
  ListMembersByPermissionOperation,
  type GetUserAccessInput,
  type ListMembersByPermissionInput,
  type UserAccess,
  type UserRefPage,
} from '@contracts/identity';
import { AccessResolver } from '../application/access-resolver.js';
import { ListMembersByPermission } from '../application/list-members-by-permission.use-case.js';

/** Internal operations other services call to read a user's access and the members with a permission. */
@Injectable()
export class AccessInternalOperations {
  constructor(
    private readonly resolver: AccessResolver,
    private readonly membersByPermission: ListMembersByPermission,
  ) {}

  /**
   * Internal operation that returns the access of a user in a tenant.
   * @param input User and tenant.
   * @returns The access, or the business error.
   */
  @InternalHandler(GetUserAccessOperation)
  async getUserAccess(
    input: GetUserAccessInput,
  ): Promise<HandlerResult<UserAccess>> {
    return {
      outcome: CallOutcome.success(
        await this.resolver.resolve(input.userId, input.tenantId),
      ),
    };
  }

  /**
   * Internal operation that lists the members of a tenant that hold a permission.
   * @param input Tenant, permission and cursor.
   * @returns One page of members.
   */
  @InternalHandler(ListMembersByPermissionOperation)
  async listMembersByPermission(
    input: ListMembersByPermissionInput,
  ): Promise<HandlerResult<UserRefPage>> {
    return {
      outcome: CallOutcome.success(
        await this.membersByPermission.execute(input),
      ),
    };
  }
}
