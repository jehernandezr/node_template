import type { DeviceApproval } from '@contracts/identity';

/** Aprobaciones pendientes de cada dispositivo verificador y nonces ya usados en sus firmas. */
export abstract class DeviceApprovalStore {
  abstract enqueue(
    deviceId: string,
    approval: DeviceApproval,
    ttlMs: number,
  ): Promise<void>;
  /** Las vigentes, sin consumirlas: el dispositivo puede volver a pedirlas. */
  abstract pending(
    deviceId: string,
    now: Date,
  ): Promise<readonly DeviceApproval[]>;
  /** Quita la aprobación de ese dispositivo y la devuelve; `undefined` si no era suya o ya no estaba. */
  abstract remove(
    deviceId: string,
    challengeId: string,
  ): Promise<DeviceApproval | undefined>;
  /** Devuelve `false` si el nonce ya se usó: una firma no se repite. */
  abstract useNonce(deviceId: string, nonce: string): Promise<boolean>;
}
