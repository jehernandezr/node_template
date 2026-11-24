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

/** Operaciones internas sobre los datos de tasks de un usuario o un tenant. */
@Injectable()
export class PrivacyInternalOperations {
  constructor(private readonly tasks: TasksFacade) {}

  /** Repetirla no cambia nada: el usuario ya no figura en ninguna tarea. */
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
