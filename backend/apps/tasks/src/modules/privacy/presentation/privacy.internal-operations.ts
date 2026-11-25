import { Injectable } from '@nestjs/common';
import {
  EraseTasksUserDataOperation,
  ListTaskChangesOperation,
  type EraseTasksUserInput,
  type EraseTasksUserResult,
  type ListTaskChangesInput,
  type TaskChangePage,
} from '@contracts/tasks';
import type { HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { CallOutcome } from '@platform/primitives';
import { TasksFacade } from '../../tasks/index.js';

/** Internal operations over the tasks data of a user or a tenant. */
@Injectable()
export class PrivacyInternalOperations {
  constructor(private readonly tasks: TasksFacade) {}

  /** Repeating it changes nothing: the user no longer appears in any task. */
  @InternalHandler(EraseTasksUserDataOperation)
  async eraseUserData(
    input: EraseTasksUserInput,
  ): Promise<HandlerResult<EraseTasksUserResult>> {
    const affectedRows = await this.tasks.anonymizeUser(input.user.userId);
    return {
      outcome: CallOutcome.success({ userId: input.user.userId, affectedRows }),
    };
  }

  @InternalHandler(ListTaskChangesOperation)
  async listChanges(
    input: ListTaskChangesInput,
  ): Promise<HandlerResult<TaskChangePage>> {
    return {
      outcome: CallOutcome.success(await this.tasks.listChanges(input)),
    };
  }
}
