import type { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';

/**
 * Un correo transaccional de identity: plantilla, destinatario, idioma y variables del texto. Sin idioma, el
 * correo sale en el idioma por defecto: una invitación va a alguien que todavía no tiene cuenta.
 */
export interface OutgoingEmail {
  readonly template: IdentityEmailTemplate;
  readonly to: string;
  readonly locale?: string;
  readonly variables: Readonly<Record<string, string>>;
}
