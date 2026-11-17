/** Una passkey registrada del usuario. */
export interface Passkey {
  readonly id: string;
  readonly userId: string;
  /** Id de la credencial en base64url, como lo devuelve el autenticador. */
  readonly credentialId: string;
  /** Clave pública COSE en base64url. */
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
