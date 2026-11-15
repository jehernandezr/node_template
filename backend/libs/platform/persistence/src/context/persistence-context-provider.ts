import type { PersistenceContext } from './persistence-context.js';

/** Fuente del contexto de la petición. Se llama en cada sentencia, así que debe ser barata. */
export abstract class PersistenceContextProvider {
  /** Contexto vacío (`{}`) cuando no hay petición, mensaje ni job activo. */
  abstract current(): PersistenceContext;
}
