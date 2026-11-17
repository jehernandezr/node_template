import type { AuthMethodReference, MfaFactor } from '@contracts/identity';
import type { PendingPurpose } from '../enums/pending-purpose.enum.js';
import type { ClientInfo } from './client-info.type.js';
import type { UserRef } from './user-ref.type.js';

/** Autenticación a medias: espera un segundo factor. Vive 10 minutos en Valkey. */
export interface PendingAuthentication {
  readonly id: string;
  readonly user: UserRef;
  readonly purpose: PendingPurpose;
  /** Dispositivo que reconoció el inicio de sesión, si lo hubo. */
  readonly deviceId?: string;
  /** Métodos de segundo factor que se ofrecieron. */
  readonly offeredFactors: readonly MfaFactor[];
  /** Sesión a elevar, solo con `PendingPurpose.StepUp`. */
  readonly sessionId?: string;
  readonly client: ClientInfo;
  /** Métodos ya cumplidos antes del segundo factor (la contraseña o la passkey). */
  readonly authMethods: readonly AuthMethodReference[];
  readonly expiresAt: Date;
}
