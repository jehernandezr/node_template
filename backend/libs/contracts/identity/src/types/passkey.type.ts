import type { Page } from '@contracts/platform';

/**
 * Opciones de WebAuthn en base64url. El cliente las pasa tal cual a la API
 * del sistema, por eso viajan como texto y no como objeto.
 */
export interface PasskeyOptions {
  challengeId: string;
  optionsJson: string;
}

/** Verificación de un inicio de sesión con passkey. */
export interface PasskeySignInVerifyRequest {
  challengeId: string;
  credentialJson: string;
  deviceId?: string;
}

/** Opciones de passkey para el segundo factor de un login pendiente. */
export interface PasskeyMfaOptionsRequest {
  mfaToken: string;
}

/** Verificación de passkey como segundo factor de un login pendiente. */
export interface PasskeyMfaVerifyRequest {
  mfaToken: string;
  challengeId: string;
  credentialJson: string;
  devicePublicKey?: string;
}

/** Opciones de passkey para el paso adicional de una sesión abierta. */
export interface PasskeyStepUpOptionsRequest {
  mfaToken: string;
}

/** Verificación de passkey para el paso adicional de una sesión abierta. */
export interface PasskeyStepUpVerifyRequest {
  mfaToken: string;
  challengeId: string;
  credentialJson: string;
}

/** Passkey registrada. La clave privada nunca sale del dispositivo. */
export interface PasskeySummary {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  /** Verdadero si la credencial está respaldada en la nube del proveedor. */
  backedUp: boolean;
}

export type PasskeyPage = Page<PasskeySummary>;

/** Registro de una passkey nueva con la respuesta firmada por el autenticador. */
export interface RegisterPasskeyRequest {
  challengeId: string;
  credentialJson: string;
  name: string;
}

/** Passkey a quitar. */
export interface RemovePasskeyRequest {
  passkeyId: string;
}
