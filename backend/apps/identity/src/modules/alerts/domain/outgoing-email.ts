import type { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';

/**
 * An identity transactional email: template, recipient, language and text variables. Without a language, the
 * email goes out in the default language: an invitation goes to someone who does not have an account yet.
 */
export interface OutgoingEmail {
  readonly template: IdentityEmailTemplate;
  readonly to: string;
  readonly locale?: string;
  readonly variables: Readonly<Record<string, string>>;
}
