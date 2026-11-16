import type { SecurityAlertType } from '@contracts/identity';
import type { UserRef } from '../../../shared/types/user-ref.type.js';

/** Aviso de seguridad para un usuario. No lleva códigos ni secretos. */
export interface SecurityAlert {
  readonly type: SecurityAlertType;
  readonly user: UserRef;
  /** Datos para el texto del aviso: dispositivo, ciudad aproximada, método. Nunca secretos. */
  readonly context?: Readonly<Record<string, string>>;
}
