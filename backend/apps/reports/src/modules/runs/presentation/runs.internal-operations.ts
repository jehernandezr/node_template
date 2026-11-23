import { Injectable } from '@nestjs/common';
import {
  EraseReportsUserDataOperation,
  reportsContract,
  type EraseReportsUserInput,
  type EraseReportsUserResult,
} from '@contracts/reports';
import type { HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { CallOutcome } from '@platform/primitives';
import { OperationNotImplementedError } from '../../../shared/errors/operation-not-implemented.error.js';
import { EraseRequester } from '../application/erase-requester.use-case.js';

/** Borrado de los datos de un usuario en reports. Las operaciones de traslado llegan con `MoveTenant`. */
@Injectable()
export class RunsInternalOperations {
  constructor(private readonly eraseRequester: EraseRequester) {}

  /** Repetirla no cambia nada: el usuario ya no figura en ninguna ejecución. */
  @InternalHandler(EraseReportsUserDataOperation)
  async eraseUserData(
    input: EraseReportsUserInput,
  ): Promise<HandlerResult<EraseReportsUserResult>> {
    const affectedRows = await this.eraseRequester.execute(input.user);
    return {
      outcome: CallOutcome.success({ userId: input.user.userId, affectedRows }),
    };
  }

  @InternalHandler(reportsContract.operations.tenantMoveSync)
  tenantMoveSync(): never {
    throw new OperationNotImplementedError(
      reportsContract.operations.tenantMoveSync.id,
    );
  }

  @InternalHandler(reportsContract.operations.tenantMoveFinalize)
  tenantMoveFinalize(): never {
    throw new OperationNotImplementedError(
      reportsContract.operations.tenantMoveFinalize.id,
    );
  }

  @InternalHandler(reportsContract.operations.tenantMoveAbort)
  tenantMoveAbort(): never {
    throw new OperationNotImplementedError(
      reportsContract.operations.tenantMoveAbort.id,
    );
  }

  @InternalHandler(reportsContract.operations.tenantMoveCleanup)
  tenantMoveCleanup(): never {
    throw new OperationNotImplementedError(
      reportsContract.operations.tenantMoveCleanup.id,
    );
  }
}
