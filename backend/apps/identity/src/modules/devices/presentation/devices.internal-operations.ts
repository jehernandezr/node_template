import { Injectable } from '@nestjs/common';
import { InternalHandler } from '@platform/internal-api/nest';
import type { HandlerResult } from '@platform/internal-api';
import { CallOutcome } from '@platform/primitives';
import {
  ListPushTargetsOperation,
  type ListPushTargetsInput,
  type PushTargets,
} from '@contracts/identity';
import { ListPushTargets } from '../application/list-push-targets.use-case.js';

/** Internal operation notifications calls to find the push targets of a user. */
@Injectable()
export class DevicesInternalOperations {
  constructor(private readonly pushTargets: ListPushTargets) {}

  /**
   * Internal operation that lists the push targets of a user.
   * @param input User to read.
   * @returns Its push targets.
   */
  @InternalHandler(ListPushTargetsOperation)
  async listPushTargets(
    input: ListPushTargetsInput,
  ): Promise<HandlerResult<PushTargets>> {
    return {
      outcome: CallOutcome.success(await this.pushTargets.execute(input.user)),
    };
  }
}
