import type { DeviceSignatureFields } from '@contracts/identity';

/** The text a device signs: `<action>\n<deviceId>\n<timestamp>\n<nonce>[\n<bound>...]`. Pure utility. */
export class DeviceSignedMessage {
  /**
   * Builds the signed text of a request.
   * @param action Route the device calls.
   * @param fields Signature fields of the request.
   * @param bound Request values the signature covers after the nonce.
   * @returns The exact text whose ES256 signature the device sends.
   */
  static of(
    action: string,
    fields: Omit<DeviceSignatureFields, 'signature'>,
    bound: readonly string[] = [],
  ): string {
    return [
      action,
      fields.deviceId,
      fields.timestamp,
      fields.nonce,
      ...bound,
    ].join('\n');
  }
}
