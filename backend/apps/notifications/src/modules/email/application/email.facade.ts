import type { EmailRequest } from './email-request.js';

/** Email sending for the other modules. */
export abstract class EmailFacade {
  /**
   * Sends the email only once per `messageId` and returns the provider's id.
   * @throws RecipientSuppressedError, TemplateUnknownError, TemplateParameterMissingError or EmailInProgressError.
   */
  abstract send(request: EmailRequest): Promise<string>;
}
