import type { EmailRequest } from './email-request.js';

/** Envío de correos para los otros módulos. */
export abstract class EmailFacade {
  /**
   * Envía el correo una sola vez por `messageId` y devuelve el id del proveedor.
   * @throws RecipientSuppressedError o TemplateUnknownError.
   */
  abstract send(request: EmailRequest): Promise<string>;
}
