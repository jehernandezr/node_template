import { EmailAlreadyRegisteredTemplate } from './email-already-registered.template.js';
import { EmailChangeTemplate } from './email-change.template.js';
import type { EmailTemplate } from './email-template.js';
import { InvitationTemplate } from './invitation.template.js';
import { MfaCodeTemplate } from './mfa-code.template.js';
import { MfaRecoveryTemplate } from './mfa-recovery.template.js';
import { NotificationTemplate } from './notification.template.js';
import { PasswordResetTemplate } from './password-reset.template.js';
import { VerifyEmailTemplate } from './verify-email.template.js';

/** Las plantillas que notifications sabe armar, por su llave. */
export class EmailTemplates {
  private readonly byKey: ReadonlyMap<string, EmailTemplate>;

  constructor(
    templates: readonly EmailTemplate[] = [
      new VerifyEmailTemplate(),
      new PasswordResetTemplate(),
      new MfaCodeTemplate(),
      new EmailChangeTemplate(),
      new InvitationTemplate(),
      new EmailAlreadyRegisteredTemplate(),
      new MfaRecoveryTemplate(),
      new NotificationTemplate(),
    ],
  ) {
    this.byKey = new Map(templates.map((template) => [template.key, template]));
  }

  find(key: string): EmailTemplate | undefined {
    return this.byKey.get(key);
  }
}
