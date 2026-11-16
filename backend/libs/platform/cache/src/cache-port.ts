/**
 * Puerto de almacenamiento del caché de consultas. Los valores son texto
 * opaco. Todos sus miembros son abstractos, así que un objeto literal con esos
 * métodos sigue sirviendo de doble.
 */
export abstract class CachePort {
  /** Valor guardado, o `undefined` si no existe o venció. */
  abstract get(key: string): Promise<string | undefined>;

  /** Guarda un valor. Vence a los `ttlMs` milisegundos, o nunca si se omite. */
  abstract set(key: string, value: string, ttlMs?: number): Promise<void>;

  /** Guarda solo si la llave no existe o venció. Devuelve `true` si guardó. */
  abstract setIfAbsent(key: string, value: string): Promise<boolean>;

  /** Borra la llave si existe. */
  abstract delete(key: string): Promise<void>;
}
