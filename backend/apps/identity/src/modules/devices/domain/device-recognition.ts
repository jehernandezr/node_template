import type { DeviceSnapshot } from './device-snapshot.js';

/** Resultado de reconocer el `deviceId` firmado que trae un inicio de sesión. */
export interface DeviceRecognition {
  /** Verdadero si el `deviceId` es válido y su dispositivo está registrado y confiable. */
  readonly recognized: boolean;
  readonly device?: DeviceSnapshot;
}
