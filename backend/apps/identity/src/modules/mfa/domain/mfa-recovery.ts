/** Estado de una recuperación del segundo factor sin dispositivo. */
export enum MfaRecoveryStatus {
  Pending = 'pending',
  Completed = 'completed',
}

/** Recuperación del segundo factor: espera un tiempo creciente antes de poder confirmarse. */
export interface MfaRecovery {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly requestedAt: Date;
  readonly availableAt: Date;
  readonly status: MfaRecoveryStatus;
  readonly version?: number;
}
