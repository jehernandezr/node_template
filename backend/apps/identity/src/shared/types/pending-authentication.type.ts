import type { AuthMethodReference, MfaFactor } from '@contracts/identity';
import type { PendingPurpose } from '../enums/pending-purpose.enum.js';
import type { ClientInfo } from './client-info.type.js';
import type { UserRef } from './user-ref.type.js';

/** Half-done authentication: waits for a second factor. Lives 10 minutes in Valkey. */
export interface PendingAuthentication {
  readonly id: string;
  readonly user: UserRef;
  readonly purpose: PendingPurpose;
  /** Device that recognized the sign-in, if any. */
  readonly deviceId?: string;
  /** Second factor methods that were offered. */
  readonly offeredFactors: readonly MfaFactor[];
  /** Session to elevate, only with `PendingPurpose.StepUp`. */
  readonly sessionId?: string;
  readonly client: ClientInfo;
  /** Methods already satisfied before the second factor (the password or the passkey). */
  readonly authMethods: readonly AuthMethodReference[];
  readonly expiresAt: Date;
}
