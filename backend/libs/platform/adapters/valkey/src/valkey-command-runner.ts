import type { ValkeyArgument } from './valkey-argument.js';

/**
 * What the adapters use from a Valkey client: a generic call to
 * a command. An iovalkey `Valkey` (or `Cluster`) instance satisfies it.
 * The keys a script touches together share a hash tag, so they also
 * work in a cluster.
 */
export interface ValkeyCommandRunner {
  call(command: string, args: ValkeyArgument[]): Promise<unknown>;
}
