import type { UserRef } from '@contracts/platform';

/** Who is notified: their reference, their email and their language. */
export interface Recipient {
  readonly ref: UserRef;
  readonly email: string;
  readonly locale: string;
  readonly displayName: string;
}
