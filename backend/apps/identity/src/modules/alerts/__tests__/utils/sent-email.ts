import type { IdentityEmailTemplate } from '../../../../shared/enums/identity-email-template.enum.js';

/** Un correo que el fake de `IdentityMailer` registró. */
export interface SentEmail {
  readonly template: IdentityEmailTemplate;
  readonly to: string;
  readonly variables: Readonly<Record<string, string>>;
}
