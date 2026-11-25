import { InternalHandlerMetadata } from './internal-handler.metadata.js';

/**
 * Declares that a provider method handles an operation. The method
 * receives the already parsed input and the `CallMeta`, and returns a `HandlerResult`.
 * `InternalHandlerExplorer` discovers it and registers it in the router.
 */
export const InternalHandler = InternalHandlerMetadata.decorator;
