import type { ValkeyArgument } from './valkey-argument.js';

/**
 * Lo que los adaptadores usan de un cliente de Valkey: una llamada genérica a
 * un comando. Una instancia de `Valkey` (o `Cluster`) de iovalkey la cumple.
 * Las llaves que un script toca juntas comparten una hash tag, así que también
 * funcionan en un clúster.
 */
export interface ValkeyCommandRunner {
  call(command: string, args: ValkeyArgument[]): Promise<unknown>;
}
