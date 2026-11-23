import { Injectable } from '@nestjs/common';
import {
  SendEmailOperation,
  type SendEmailInput,
  type SendEmailResult,
} from '@contracts/notifications';
import type { HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { CallOutcome } from '@platform/primitives';
import { NotificationsDefaults } from '../../../shared/constants/notifications-defaults.constants.js';
import { EmailFacade } from '../application/email.facade.js';

/** Correo transaccional pedido por otro servicio: el código viaja por aquí y nunca por el bus. */
@Injectable()
export class EmailInternalOperations {
  constructor(private readonly email: EmailFacade) {}

  @InternalHandler(SendEmailOperation)
  async send(input: SendEmailInput): Promise<HandlerResult<SendEmailResult>> {
    await this.email.send({
      messageId: input.messageId,
      template: input.template,
      to: input.to,
      locale: input.locale ?? NotificationsDefaults.defaultLocale,
      parameters: new Map(input.parameters.map((p) => [p.name, p.value])),
    });
    return { outcome: CallOutcome.success({ messageId: input.messageId }) };
  }
}
