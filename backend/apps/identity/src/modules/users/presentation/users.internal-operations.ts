import { Injectable } from '@nestjs/common';
import { InternalHandler } from '@platform/internal-api/nest';
import type { HandlerResult } from '@platform/internal-api';
import { CallOutcome } from '@platform/primitives';
import {
  SuspendUserOperation,
  ReactivateUserOperation,
  GetUserProfileOperation,
  EraseUserOperation,
  type EraseUserInput,
  type EraseUserResult,
  type GetUserProfileInput,
  type ReactivateUserInput,
  type SuspendUserInput,
  type UserOperationResult,
  type UserProfile,
} from '@contracts/identity';
import { ChangeUserStatus } from '../application/change-user-status.use-case.js';
import { EraseUser } from '../application/erase-user.use-case.js';
import { UserProfileView } from '../application/user-profile-view.js';
import { UserReader } from '../application/user-reader.js';

/** Internal operations of users: suspension, reactivation, profile and the deletion of the account deletion saga. */
@Injectable()
export class UsersInternalOperations {
  constructor(
    private readonly status: ChangeUserStatus,
    private readonly reader: UserReader,
    private readonly eraser: EraseUser,
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
  async eraseUser(
    input: EraseUserInput,
  ): Promise<HandlerResult<EraseUserResult>> {
    return {
      outcome: CallOutcome.success(await this.eraser.execute(input.userId)),
    };
  }
}
