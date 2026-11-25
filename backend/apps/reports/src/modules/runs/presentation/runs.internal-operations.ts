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

/** Deletion of a user's data in reports. */
@Injectable()
export class RunsInternalOperations {
  constructor(private readonly eraseRequester: EraseRequester) {}

  /** Repeating it changes nothing: the user no longer appears in any run. */
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
