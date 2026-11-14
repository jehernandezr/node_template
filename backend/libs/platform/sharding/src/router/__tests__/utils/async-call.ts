/**
 * Ejecuta una acción que puede lanzar de forma síncrona y devuelve una promesa,
 * para verificar el código de un error con `rejects.toMatchObject`.
 */
export class AsyncCall {
  static run<T>(action: () => T): Promise<T> {
    return Promise.resolve().then(action);
  }
}
