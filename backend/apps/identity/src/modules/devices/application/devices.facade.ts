import type { DeviceApproval } from '@contracts/identity';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { DeviceRecognition } from '../domain/device-recognition.js';
import type { DeviceSnapshot } from '../domain/device-snapshot.js';
import type { RegisterDeviceInput } from '../domain/register-device-input.js';

/** Lo que `devices` ofrece a los otros módulos. */
export abstract class DevicesFacade {
  abstract recognize(
    ref: UserRef,
    deviceIdToken?: string,
  ): Promise<DeviceRecognition>;
  /** El id público (`dv1_...`) de un dispositivo del usuario, con la ruta a su shard. */
  abstract issueDeviceId(ref: UserRef, deviceId: string): Promise<string>;
  /** @throws DomainError `IDENTITY.DEVICE.KEY_INVALID` si la clave no es P-256. */
  abstract register(
    ref: UserRef,
    input: RegisterDeviceInput,
  ): Promise<DeviceSnapshot>;
  abstract verifiers(ref: UserRef): Promise<readonly DeviceSnapshot[]>;
  /** Quita el rol de verificador a todos los dispositivos: la recuperación sin dispositivo los da por perdidos. */
  abstract retireVerifiers(ref: UserRef): Promise<void>;
  /** Da de baja todos los dispositivos del usuario: su cuenta se borra. */
  abstract forget(ref: UserRef): Promise<void>;
  abstract enqueueApproval(
    deviceId: string,
    approval: DeviceApproval,
  ): Promise<void>;
}
