import type { UserRef } from '@contracts/platform';

/** A quién se le avisa: su referencia, su correo y su idioma. */
export interface Recipient {
  readonly ref: UserRef;
  readonly email: string;
  readonly locale: string;
  readonly displayName: string;
}
