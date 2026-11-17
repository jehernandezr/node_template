import type { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';

/** Un correo transaccional de identity: plantilla, destinatario y variables del texto. */
export interface OutgoingEmail {
  readonly template: IdentityEmailTemplate;
  readonly to: string;
  readonly variables: Readonly<Record<string, string>>;
}
