import { EmailTemplate as EmailTemplateKey } from '@contracts/notifications';
import type { EmailCopy } from './email-copy.js';
import { EmailTemplate } from './email-template.js';

/** Response to a registration with an email that already has an account: the API does not reveal that it exists, the email does. */
export class EmailAlreadyRegisteredTemplate extends EmailTemplate {
  readonly key = EmailTemplateKey.EmailAlreadyRegistered;
  readonly version = 1;
  protected readonly copies: Readonly<Record<string, EmailCopy>> = {
    es: {
      subject: 'Ya tienes una cuenta',
      lines: [
        'Alguien intentó registrarse con este correo, que ya tiene una cuenta.',
        'Si fuiste tú, entra con tu contraseña o recupérala. Si no, ignora este mensaje.',
      ],
    },
    en: {
      subject: 'You already have an account',
      lines: [
        'Someone tried to sign up with this email, which already has an account.',
        'If it was you, sign in or reset your password. If not, ignore this message.',
      ],
    },
  };
}
