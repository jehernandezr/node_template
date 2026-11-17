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

/** Operaciones internas de devices. */
@Injectable()
export class DevicesInternalOperations {
  constructor(private readonly pushTargets: ListPushTargets) {}

  @InternalHandler(ListPushTargetsOperation)
  async listPushTargets(
    input: ListPushTargetsInput,
  ): Promise<HandlerResult<PushTargets>> {
    return {
      outcome: CallOutcome.success(await this.pushTargets.execute(input.user)),
    };
  }
}
