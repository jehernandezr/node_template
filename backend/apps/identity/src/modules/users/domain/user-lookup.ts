import type { LookupStatus } from './lookup-status.enum.js';

/** Entrada del índice global de emails: dónde vive el usuario. */
export interface UserLookup {
  readonly emailFingerprint: Buffer;
  readonly userId: string;
  readonly homeTenantId: string;
  readonly region: string;
  readonly status: LookupStatus;
  readonly createdAt: Date;
}
