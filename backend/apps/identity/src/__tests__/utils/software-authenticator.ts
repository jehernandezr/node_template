import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign,
  type KeyObject,
} from 'node:crypto';
import { CborWriter } from './cbor-writer.js';

/** The options identity delivers in `optionsJson`. */
interface WebAuthnOptions {
  readonly challenge: string;
  readonly rp?: { readonly id: string };
  readonly rpId?: string;
}

/**
 * A software platform authenticator: it creates an ES256 credential and signs assertions as the browser
 * would, with `none` attestation, so tests go through WebAuthn without a real device. Built without user
 * verification it behaves like a security key without a PIN: its assertions only prove presence.
 */
export class SoftwareAuthenticator {
  private static readonly FLAGS_USER_PRESENT_VERIFIED = 0x05;
  private static readonly FLAG_USER_PRESENT = 0x01;
  private static readonly FLAG_ATTESTED_DATA = 0x40;
  private readonly key: { privateKey: KeyObject; publicKey: KeyObject };
  private readonly credentialId = randomBytes(16);
  private counter = 0;

  constructor(
    private readonly origin: string,
    private readonly verifiesUser = true,
  ) {
    this.key = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  }

  /** base64url id of the credential. */
  get id(): string {
    return this.credentialId.toString('base64url');
  }

  /**
   * Answers `navigator.credentials.create`.
   * @param optionsJson Creation options from identity.
   * @returns The response in base64url, the `credentialJson` of the contract.
   */
  create(optionsJson: string): string {
    const options = SoftwareAuthenticator.options(optionsJson);
    const rpId = options.rp?.id ?? '';
    const clientData = this.clientData('webauthn.create', options.challenge);
    const authData = Buffer.concat([
      this.authenticatorData(
        rpId,
        SoftwareAuthenticator.FLAGS_USER_PRESENT_VERIFIED |
          SoftwareAuthenticator.FLAG_ATTESTED_DATA,
      ),
      Buffer.alloc(16),
      SoftwareAuthenticator.uint16(this.credentialId.length),
      this.credentialId,
      this.coseKey(),
    ]);
    const attestation = CborWriter.write(
      new Map<string, string | Buffer | Map<string, string>>([
        ['fmt', 'none'],
        ['attStmt', new Map()],
        ['authData', authData],
      ]),
    );
    return SoftwareAuthenticator.json({
      id: this.id,
      rawId: this.id,
      type: 'public-key',
      response: {
        clientDataJSON: clientData.toString('base64url'),
        attestationObject: attestation.toString('base64url'),
        transports: ['internal'],
      },
      clientExtensionResults: {},
      authenticatorAttachment: 'platform',
    });
  }

  /**
   * Answers `navigator.credentials.get`, with user verification only if the authenticator does it.
   * @param optionsJson Request options from identity.
   * @returns The response in base64url.
   */
  get(optionsJson: string): string {
    const options = SoftwareAuthenticator.options(optionsJson);
    const clientData = this.clientData('webauthn.get', options.challenge);
    const authData = this.authenticatorData(
      options.rpId ?? '',
      this.verifiesUser
        ? SoftwareAuthenticator.FLAGS_USER_PRESENT_VERIFIED
        : SoftwareAuthenticator.FLAG_USER_PRESENT,
    );
    const signature = sign(
      'sha256',
      Buffer.concat([
        authData,
        createHash('sha256').update(clientData).digest(),
      ]),
      this.key.privateKey,
    );
    return SoftwareAuthenticator.json({
      id: this.id,
      rawId: this.id,
      type: 'public-key',
      response: {
        clientDataJSON: clientData.toString('base64url'),
        authenticatorData: authData.toString('base64url'),
        signature: signature.toString('base64url'),
      },
      clientExtensionResults: {},
    });
  }

  private clientData(type: string, challenge: string): Buffer {
    return Buffer.from(
      JSON.stringify({
        type,
        challenge,
        origin: this.origin,
        crossOrigin: false,
      }),
    );
  }

  private authenticatorData(rpId: string, flags: number): Buffer {
    this.counter += 1;
    const count = Buffer.alloc(4);
    count.writeUInt32BE(this.counter);
    return Buffer.concat([
      createHash('sha256').update(rpId).digest(),
      Buffer.from([flags]),
      count,
    ]);
  }

  private coseKey(): Buffer {
    const jwk = this.key.publicKey.export({ format: 'jwk' });
    return CborWriter.write(
      new Map<number, number | Buffer>([
        [1, 2],
        [3, -7],
        [-1, 1],
        [-2, Buffer.from(jwk.x ?? '', 'base64url')],
        [-3, Buffer.from(jwk.y ?? '', 'base64url')],
      ]),
    );
  }

  private static options(optionsJson: string): WebAuthnOptions {
    return JSON.parse(
      Buffer.from(optionsJson, 'base64url').toString('utf8'),
    ) as WebAuthnOptions;
  }

  private static json(value: unknown): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private static uint16(value: number): Buffer {
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16BE(value);
    return buffer;
  }
}
