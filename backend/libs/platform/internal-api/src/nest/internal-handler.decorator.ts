import { InternalHandlerMetadata } from './internal-handler.metadata.js';

/**
 * Declara que un método de un provider atiende una operación. El método
 * recibe la entrada ya parseada y el `CallMeta`, y devuelve un `HandlerResult`.
 * `InternalHandlerExplorer` lo descubre y lo registra en el router.
 */
export const InternalHandler = InternalHandlerMetadata.decorator;
