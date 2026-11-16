import type { ClientPlatform } from '../enums/auth.enum.js';

/**
 * Firma que el dispositivo registrado copia en cada petición sin sesión. El
 * servidor la verifica con la clave pública guardada, así que no reemplaza al
 * access token: prueba que la petición viene del dispositivo.
 */
export interface DeviceSignatureFields {
  deviceId: string;
  /** Instante ISO 8601 en que el dispositivo firmó la petición. */
  timestamp: string;
  /** Valor aleatorio que impide reusar una firma. */
  nonce: string;
  /** Firma en base64url del contenido firmado. */
  signature: string;
}

/** Quitar un dispositivo de la cuenta. */
export interface RemoveDeviceRequest {
  deviceId: string;
}

/** Quitar la confianza de un dispositivo sin borrar su registro. */
export interface UntrustDeviceRequest {
  deviceId: string;
}

/** Token de notificaciones push del dispositivo actual. */
export interface PushTokenRequest {
  pushToken: string;
}

/** Pedido de las aprobaciones pendientes para el dispositivo que firma. */
export type PullDeviceApprovalsRequest = DeviceSignatureFields;

/** Rechazo de una aprobación pendiente, firmado por el dispositivo. */
export interface DenyDeviceApprovalRequest extends DeviceSignatureFields {
  challengeId: string;
}

/** Contexto de la solicitud que el usuario ve antes de aprobarla. */
export interface ApprovalContext {
  browser?: string;
  os?: string;
  ip?: string;
  city?: string;
}

/** Aprobación pendiente: un código que el usuario confirma en su dispositivo. */
export interface DeviceApproval {
  challengeId: string;
  code: string;
  /** Instante ISO 8601 en que se pidió la aprobación. */
  requestedAt: string;
  /** Instante ISO 8601 en que deja de ser válida. */
  expiresAt: string;
  context: ApprovalContext;
}

/** Aprobaciones pendientes de un dispositivo. */
export interface DeviceApprovals {
  approvals: DeviceApproval[];
}

/** Payload de `identity.device.registered.v1`. */
export interface DeviceRegisteredPayload {
  userId: string;
  deviceId: string;
  platform: ClientPlatform;
  /** Verdadero si el dispositivo queda como verificador de acciones sensibles. */
  verifier: boolean;
  registeredAt: string;
}

/** Payload de `identity.device.removed.v1`. */
export interface DeviceRemovedPayload {
  userId: string;
  deviceId: string;
  removedAt: string;
}
