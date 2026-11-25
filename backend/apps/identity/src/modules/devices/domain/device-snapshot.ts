import type { ClientPlatform } from '@contracts/identity';

/** Read-only view of a registered device. */
export interface DeviceSnapshot {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly platform: ClientPlatform;
  /** P-256 public key in SPKI DER, base64url. */
  readonly publicKey: string;
  /** Whether it approves codes and sensitive actions of the other sessions. */
  readonly verifier: boolean;
  readonly trustedUntil?: Date;
}
