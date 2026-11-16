import { PersistenceContextProvider } from '../../context/persistence-context-provider.js';
import type { PersistenceContext } from '../../context/persistence-context.js';

/** Contexto de persistencia que la prueba fija a mano con `set`. Empieza vacío, como fuera de una petición. */
export class FixedPersistenceContextProvider extends PersistenceContextProvider {
  private context: PersistenceContext = {};

  set(context: PersistenceContext): void {
    this.context = context;
  }

  current(): PersistenceContext {
    return this.context;
  }
}
