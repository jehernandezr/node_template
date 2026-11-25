/** Status of a recovery of the second factor without a device. */
export enum MfaRecoveryStatus {
  Pending = 'pending',
  Completed = 'completed',
  /** The user proved a second factor while it waited: it was not them, or they no longer need it. */
  Cancelled = 'cancelled',
  /** Nobody confirmed it within the window after it became available. */
  Expired = 'expired',
}

/** Recovery of the second factor: it waits a growing time before it can be confirmed. */
export interface MfaRecovery {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly requestedAt: Date;
  readonly availableAt: Date;
  readonly status: MfaRecoveryStatus;
  readonly version?: number;
}
