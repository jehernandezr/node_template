import {
  generateKeyPairSync,
  randomBytes,
  sign,
  type KeyObject,
} from 'node:crypto';

/** Clave P-256 de un dispositivo de prueba, como la que guarda el enclave seguro de la app. */
export class DeviceKey {
  private readonly privateKey: KeyObject;
  /** SPKI DER en base64url: el `devicePublicKey` del contrato. */
  readonly publicKey: string;

  constructor() {
    const pair = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    this.privateKey = pair.privateKey;
    this.publicKey = pair.publicKey
      .export({ format: 'der', type: 'spki' })
      .toString('base64url');
  }

  /** Los campos firmados de una petición sin sesión: `<acción>\n<deviceId>\n<timestamp>\n<nonce>[\n<extra>]`. */
  signed(
    action: string,
    deviceId: string,
    extra: readonly string[] = [],
  ): { deviceId: string; timestamp: string; nonce: string; signature: string } {
    const timestamp = new Date().toISOString();
    const nonce = randomBytes(16).toString('base64url');
    const message = [action, deviceId, timestamp, nonce, ...extra].join('\n');
    const signature = sign('sha256', Buffer.from(message), {
      key: this.privateKey,
      dsaEncoding: 'ieee-p1363',
    }).toString('base64url');
    return { deviceId, timestamp, nonce, signature };
  }
}
