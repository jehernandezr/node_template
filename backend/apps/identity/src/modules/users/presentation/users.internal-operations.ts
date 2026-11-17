import { Injectable } from '@nestjs/common';
import { InternalHandler } from '@platform/internal-api/nest';
import type { HandlerResult } from '@platform/internal-api';
import { CallOutcome } from '@platform/primitives';
import {
  SuspendUserOperation,
  ReactivateUserOperation,
  GetUserProfileOperation,
  EraseUserOperation,
  type GetUserProfileInput,
  type ReactivateUserInput,
  type SuspendUserInput,
  type UserOperationResult,
  type UserProfile,
} from '@contracts/identity';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';
import { ChangeUserStatus } from '../application/change-user-status.use-case.js';
import { UserProfileView } from '../application/user-profile-view.js';
import { UserReader } from '../application/user-reader.js';

/** Operaciones internas de users. El borrado llega con la saga de baja de cuenta. */
@Injectable()
export class UsersInternalOperations {
  constructor(
    private readonly status: ChangeUserStatus,
    private readonly reader: UserReader,
  ) {}

  @InternalHandler(SuspendUserOperation)
  async suspendUser(
    input: SuspendUserInput,
  ): Promise<HandlerResult<UserOperationResult>> {
    return {
      outcome: CallOutcome.success(
        await this.status.suspend(input.userId, input.reason),
      ),
    };
  }

  @InternalHandler(ReactivateUserOperation)
  async reactivateUser(
    input: ReactivateUserInput,
  ): Promise<HandlerResult<UserOperationResult>> {
    return {
      outcome: CallOutcome.success(await this.status.reactivate(input.userId)),
    };
  }

  @InternalHandler(GetUserProfileOperation)
  async getUserProfile(
    input: GetUserProfileInput,
  ): Promise<HandlerResult<UserProfile>> {
    const ref = await this.reader.requireRef(input.userId);
    return {
      outcome: CallOutcome.success(
        UserProfileView.of(await this.reader.getByRef(ref)),
      ),
    };
  }

  @InternalHandler(EraseUserOperation)
  eraseUser(): never {
    throw new RouteNotImplementedError(EraseUserOperation.id);
  }
}
