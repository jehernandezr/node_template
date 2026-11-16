import type { UserStatus } from '../enums/user.enum.js';

/** Alta de un usuario. El idioma viaja como etiqueta BCP 47. */
export interface SignUpRequest {
  email: string;
  password: string;
  displayName: string;
  locale: string;
  /** Token de la invitación que el usuario acepta al registrarse. */
  invitationToken?: string;
}

/** Pedido de un nuevo email de verificación. */
export interface EmailVerificationRequest {
  email: string;
}

/** Confirmación de la verificación con el token que llegó por email. */
export interface EmailVerificationConfirmRequest {
  token: string;
}

/** Perfil del usuario autenticado. */
export interface UserProfile {
  id: string;
  email: string;
  /** Instante ISO 8601 de la verificación, o null mientras no está verificado. */
  emailVerifiedAt: string | null;
  displayName: string;
  locale: string;
  status: UserStatus;
  homeTenantId: string;
  /** Último tenant en el que el usuario abrió sesión, o null si nunca. */
  lastTenantId: string | null;
}

/** Cambios parciales del perfil. Los campos ausentes no cambian. */
export interface UpdateProfileRequest {
  displayName?: string;
  locale?: string;
}

/** Pedido de cambio de email hacia una dirección nueva. */
export interface EmailChangeRequest {
  newEmail: string;
}

/** Confirmación del cambio de email con el token enviado a la dirección nueva. */
export interface EmailChangeConfirmRequest {
  token: string;
}

/** Entrada de la operación interna que suspende a un usuario. */
export interface SuspendUserInput {
  userId: string;
  reason?: string;
}

/** Entrada de la operación interna que reactiva a un usuario. */
export interface ReactivateUserInput {
  userId: string;
}

/** Resultado de suspender o reactivar a un usuario. */
export interface UserOperationResult {
  userId: string;
  status: UserStatus;
}

/** Entrada de la operación interna que lee el perfil de un usuario. */
export interface GetUserProfileInput {
  userId: string;
}

/** Payload de `identity.user.registered.v1`. */
export interface UserRegisteredPayload {
  userId: string;
  homeTenantId: string;
  registeredAt: string;
}

/** Payload de `identity.user.suspended.v1`. */
export interface UserSuspendedPayload {
  userId: string;
  reason?: string;
  suspendedAt: string;
}

/** Payload de `identity.user.reactivated.v1`. */
export interface UserReactivatedPayload {
  userId: string;
  reactivatedAt: string;
}

/** Payload de `identity.user.email-changed.v1`. */
export interface UserEmailChangedPayload {
  userId: string;
  changedAt: string;
}
