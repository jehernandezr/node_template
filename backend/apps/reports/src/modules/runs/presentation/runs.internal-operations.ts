import { Injectable } from '@nestjs/common';
import {
  EraseReportsUserDataOperation,
  type EraseReportsUserInput,
  type EraseReportsUserResult,
} from '@contracts/reports';
import type { HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { CallOutcome } from '@platform/primitives';
import { EraseRequester } from '../application/erase-requester.use-case.js';

/** Borrado de los datos de un usuario en reports. */
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
}
