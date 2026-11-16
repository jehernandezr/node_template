import type { ClientPlatform } from '@contracts/identity';

/** Datos con los que `DevicesFacade.register` guarda un dispositivo nuevo. */
export interface RegisterDeviceInput {
  /** `devicePublicKey` del contrato: SPKI DER en base64url. */
  readonly publicKey: string;
  readonly platform: ClientPlatform;
  readonly name?: string;
  readonly ip: string;
}
