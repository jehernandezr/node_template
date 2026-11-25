import type { ClientPlatform } from '@contracts/identity';

/** Data `DevicesFacade.register` uses to store a new device. */
export interface RegisterDeviceInput {
  /** Contract `devicePublicKey`: SPKI DER in base64url. */
  readonly publicKey: string;
  readonly platform: ClientPlatform;
  readonly name?: string;
  readonly ip: string;
}
