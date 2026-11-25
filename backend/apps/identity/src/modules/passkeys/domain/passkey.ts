/** A registered passkey of the user. */
export interface Passkey {
  readonly id: string;
  readonly userId: string;
  /** Credential id in base64url, as the authenticator returns it. */
  readonly credentialId: string;
  /** COSE public key in base64url. */
  readonly publicKey: string;
  readonly signCount: number;
  readonly transports: readonly string[];
  readonly aaguid: string;
  readonly backedUp: boolean;
  readonly name: string;
  readonly lastUsedAt?: Date;
  readonly createdAt: Date;
  readonly version?: number;
}
