/**
 * Datos de vida corta de identity (desafíos, autenticaciones pendientes, contadores, nonces). Cada
 * operación es atómica en el servidor, así que dos réplicas no pueden usar dos veces el mismo valor.
 */
export abstract class EphemeralStore {
  abstract get(key: string): Promise<string | undefined>;

  abstract set(key: string, value: string, ttlMs: number): Promise<void>;

  /** Guarda solo si la llave no existe. Devuelve `true` si la guardó. */
  abstract setIfAbsent(
    key: string,
    value: string,
    ttlMs: number,
  ): Promise<boolean>;

  /** Lee y borra en un solo paso: el valor se usa una vez. */
  abstract take(key: string): Promise<string | undefined>;

  abstract delete(key: string): Promise<void>;

  /** Suma uno y devuelve el valor nuevo. La vida corre desde el primer incremento. */
  abstract increment(key: string, ttlMs: number): Promise<number>;

  /** Milisegundos que le quedan a la llave, o `undefined` si no existe. */
  abstract remainingMs(key: string): Promise<number | undefined>;

  /** Guarda un campo de un mapa; cada escritura renueva la vida del mapa completo. */
  abstract putField(
    key: string,
    field: string,
    value: string,
    ttlMs: number,
  ): Promise<void>;

  /** Lee y borra el mapa en un solo paso: lo escrito después queda para la siguiente lectura. */
  abstract takeFields(key: string): Promise<ReadonlyMap<string, string>>;
}
