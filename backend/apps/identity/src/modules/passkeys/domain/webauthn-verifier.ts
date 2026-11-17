import type { Passkey } from './passkey.js';

/** Credencial nueva verificada al registrar una passkey. */
export interface VerifiedRegistration {
  readonly credentialId: string;
  readonly publicKey: string;
  readonly signCount: number;
  readonly transports: readonly string[];
  readonly aaguid: string;
  readonly backedUp: boolean;
}

/** Aserción verificada al usar una passkey. */
export interface VerifiedAssertion {
  readonly newSignCount: number;
  readonly userVerified: boolean;
}

/** WebAuthn: opciones para el navegador y verificación de sus respuestas. */
export abstract class WebAuthnVerifier {
  abstract registrationOptions(input: {
    challenge: string;
    userId: string;
    userName: string;
    exclude: readonly Passkey[];
  }): Promise<unknown>;

  abstract authenticationOptions(input: {
    challenge: string;
    allow: readonly Passkey[];
  }): Promise<unknown>;

  /** `undefined` si la respuesta no verifica. */
  abstract verifyRegistration(
    response: unknown,
    challenge: string,
  ): Promise<VerifiedRegistration | undefined>;

  /** `undefined` si la aserción no verifica o el contador de firmas retrocedió. */
  abstract verifyAuthentication(
    response: unknown,
    challenge: string,
    passkey: Passkey,
  ): Promise<VerifiedAssertion | undefined>;

  /** El id de la credencial de una respuesta de aserción, sin verificarla. */
  abstract credentialIdOf(response: unknown): string | undefined;
}
