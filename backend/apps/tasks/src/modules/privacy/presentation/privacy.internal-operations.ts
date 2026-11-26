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

  /**
   * Internal operation that removes a user from every task of the shard as author or editor.
   * Repeating it changes nothing: the user no longer appears in any task.
   * @param input User to erase.
   * @returns How many tasks changed.
   */
  @InternalHandler(EraseTasksUserDataOperation)
  async eraseUserData(
    input: EraseTasksUserInput,
  ): Promise<HandlerResult<EraseTasksUserResult>> {
    const affectedRows = await this.tasks.anonymizeUser(input.user.userId);
    return {
      outcome: CallOutcome.success({ userId: input.user.userId, affectedRows }),
    };
  }

  /**
   * Internal operation that lists task changes after a cursor, for the reports projection.
   * @param input Tenant, cursor and page size.
   * @returns One page of task changes.
   */
  @InternalHandler(ListTaskChangesOperation)
  async listChanges(
    input: ListTaskChangesInput,
  ): Promise<HandlerResult<TaskChangePage>> {
    return {
      outcome: CallOutcome.success(await this.tasks.listChanges(input)),
    };
  }
}
