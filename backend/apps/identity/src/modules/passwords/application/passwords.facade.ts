import type { UserRef } from '../../../shared/types/user-ref.type.js';

/** Lo que `passwords` ofrece a los otros módulos. */
export abstract class PasswordsFacade {
  /**
   * Verifica la contraseña. Sin `ref` (usuario inexistente) compara contra un hash fijo para que
   * el tiempo de respuesta no revele si el email existe, y devuelve `false`.
   */
  abstract verify(ref: UserRef | undefined, password: string): Promise<boolean>;
  abstract setInitial(ref: UserRef, password: string): Promise<void>;
}
