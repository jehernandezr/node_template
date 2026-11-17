/** Hash de contraseñas en formato PHC. */
export abstract class PasswordHasher {
  abstract hash(password: string): Promise<string>;

  /** Compara en tiempo constante. Un hash mal formado no coincide. */
  abstract verify(password: string, hash: string): Promise<boolean>;

  /** Verdadero si el hash usa parámetros distintos de los vigentes y conviene rehacerlo. */
  abstract needsRehash(hash: string): boolean;
}
