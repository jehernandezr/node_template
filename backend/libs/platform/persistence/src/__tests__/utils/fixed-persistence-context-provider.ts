import { PersistenceContextProvider } from '../../context/persistence-context-provider.js';
import type { PersistenceContext } from '../../context/persistence-context.js';

/** Persistence context that the test sets by hand with `set`. Starts empty, as outside a request. */
export class FixedPersistenceContextProvider extends PersistenceContextProvider {
  private context: PersistenceContext = {};

  set(context: PersistenceContext): void {
    this.context = context;
  }

  override current(): PersistenceContext {
    return this.context;
  }
}
