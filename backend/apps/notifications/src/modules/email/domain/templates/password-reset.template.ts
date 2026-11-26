import {
  EmailTemplate as EmailTemplateKey,
  TemplateParameter,
} from '@contracts/notifications';
import type { EmailCopy } from './email-copy.js';
import { EmailTemplate } from './email-template.js';

/** Email with the password reset link. */
export class PasswordResetTemplate extends EmailTemplate {
  readonly key = EmailTemplateKey.PasswordReset;
  readonly version = 1;
  protected override readonly optionalParameters: ReadonlySet<string> = new Set(
    [TemplateParameter.DisplayName],
  );
  protected readonly copies: Readonly<Record<string, EmailCopy>> = {
    es: {
      subject: 'Recupera tu contraseña',
      lines: [
        'Hola {display_name}:',
        'Pediste cambiar tu contraseña.',
        'Tu código para cambiarla es {code} y vence pronto.',
      ],
      action: 'Cambiar contraseña',
    },
    en: {
      subject: 'Reset your password',
      lines: [
        'Hi {display_name},',
        'You asked to change your password.',
        'Your code to change it is {code} and expires soon.',
      ],
      action: 'Change password',
    },
  };
}
