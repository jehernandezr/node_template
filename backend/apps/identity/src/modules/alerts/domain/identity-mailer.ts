import type { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';

/** Envía el correo transaccional de identity. El adaptador real delega en el servicio `notifications`. */
export abstract class IdentityMailer {
  abstract send(
    template: IdentityEmailTemplate,
    to: string,
    variables: Readonly<Record<string, string>>,
  ): Promise<void>;
}
