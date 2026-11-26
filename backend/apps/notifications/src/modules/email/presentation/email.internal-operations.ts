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

/** Transactional email requested by another service: the code travels through here and never through the bus. */
@Injectable()
export class EmailInternalOperations {
  constructor(private readonly email: EmailFacade) {}

  /**
   * Internal operation that sends a transactional email once per `messageId`.
   * @param input Template, recipient and parameters.
   * @returns The provider id, or the business error.
   */
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
