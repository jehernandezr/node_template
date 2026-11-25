import type { LookupStatus } from './lookup-status.enum.js';

/** Entry of the global email index: where the user lives. */
export interface UserLookup {
  readonly emailFingerprint: Buffer;
  readonly userId: string;
  readonly homeTenantId: string;
  readonly region: string;
  readonly status: LookupStatus;
  readonly createdAt: Date;
}
