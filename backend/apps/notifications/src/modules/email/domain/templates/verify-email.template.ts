import {
  EmailTemplate as EmailTemplateKey,
  TemplateParameter,
} from '@contracts/notifications';
import type { EmailCopy } from './email-copy.js';
import { EmailTemplate } from './email-template.js';

/** Email with the address verification link. */
export class VerifyEmailTemplate extends EmailTemplate {
  readonly key = EmailTemplateKey.VerifyEmail;
  readonly version = 1;
  protected override readonly optionalParameters: ReadonlySet<string> = new Set(
    [TemplateParameter.DisplayName],
  );
  protected readonly copies: Readonly<Record<string, EmailCopy>> = {
    es: {
      subject: 'Confirma tu correo',
      lines: [
        'Hola {display_name}:',
        'Tu código para confirmar el correo es {code}.',
      ],
      action: 'Confirmar correo',
    },
    en: {
      subject: 'Confirm your email',
      lines: [
        'Hi {display_name},',
        'Your code to confirm your email is {code}.',
      ],
      action: 'Confirm email',
    },
  };
}
