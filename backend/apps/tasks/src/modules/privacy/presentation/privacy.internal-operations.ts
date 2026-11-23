import { Injectable } from '@nestjs/common';
import {
  EraseTasksUserDataOperation,
  ListTaskChangesOperation,
  tasksContract,
  type EraseTasksUserInput,
  type EraseTasksUserResult,
  type ListTaskChangesInput,
  type TaskChangePage,
} from '@contracts/tasks';
import type { HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { CallOutcome } from '@platform/primitives';
import { OperationNotImplementedError } from '../../../shared/errors/operation-not-implemented.error.js';
import { TasksFacade } from '../../tasks/index.js';

/** Operaciones internas sobre los datos de tasks de un usuario o un tenant. Las de traslado llegan con `MoveTenant`. */
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

  @InternalHandler(tasksContract.operations.tenantMoveSync)
  tenantMoveSync(): never {
    throw new OperationNotImplementedError(
      tasksContract.operations.tenantMoveSync.id,
    );
  }

  @InternalHandler(tasksContract.operations.tenantMoveFinalize)
  tenantMoveFinalize(): never {
    throw new OperationNotImplementedError(
      tasksContract.operations.tenantMoveFinalize.id,
    );
  }

  @InternalHandler(tasksContract.operations.tenantMoveAbort)
  tenantMoveAbort(): never {
    throw new OperationNotImplementedError(
      tasksContract.operations.tenantMoveAbort.id,
    );
  }

  @InternalHandler(tasksContract.operations.tenantMoveCleanup)
  tenantMoveCleanup(): never {
    throw new OperationNotImplementedError(
      tasksContract.operations.tenantMoveCleanup.id,
    );
  }
}
