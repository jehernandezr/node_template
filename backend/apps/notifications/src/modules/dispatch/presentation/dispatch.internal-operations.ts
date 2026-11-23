import { Injectable } from '@nestjs/common';
import {
  NotifyUserOperation,
  type NotifyUserInput,
  type NotifyUserResult,
} from '@contracts/notifications';
import type { HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { CallOutcome } from '@platform/primitives';
import { DispatchFacade } from '../application/dispatch.facade.js';

/** Aviso pedido por otro servicio, por ejemplo el paso de bienvenida de una saga. */
@Injectable()
export class DispatchInternalOperations {
  constructor(private readonly dispatch: DispatchFacade) {}

  @InternalHandler(NotifyUserOperation)
  async notify(
    input: NotifyUserInput,
  ): Promise<HandlerResult<NotifyUserResult>> {
    const channels = await this.dispatch.notify({
      notificationId: input.notificationId,
      user: input.user,
      tenantId: input.tenantId,
      type: input.type,
      parameters: new Map(input.parameters.map((p) => [p.name, p.value])),
    });
    return {
      outcome: CallOutcome.success({
        notificationId: input.notificationId,
        channels: [...channels],
      }),
    };
  }
}
