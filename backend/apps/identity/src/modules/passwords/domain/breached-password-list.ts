/** Contraseñas conocidas por filtraciones: no se aceptan aunque cumplan la política. */
export abstract class BreachedPasswordList {
  abstract contains(password: string): Promise<boolean>;
}
