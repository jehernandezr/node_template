import type { ClientPlatform } from '@contracts/identity';

/** Vista de solo lectura de un dispositivo registrado. */
export interface DeviceSnapshot {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly platform: ClientPlatform;
  /** Clave pública P-256 en SPKI DER, base64url. */
  readonly publicKey: string;
  /** Si aprueba códigos y acciones sensibles de las otras sesiones. */
  readonly verifier: boolean;
  readonly trustedUntil?: Date;
}
