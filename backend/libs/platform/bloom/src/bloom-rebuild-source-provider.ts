import type { BloomRebuildSource } from './bloom-rebuild-source.js';

/**
 * Provides the source of truth of a filter. Each call returns a new source, read from the
 * database or the service that owns the data.
 */
export abstract class BloomRebuildSourceProvider {
  /**
   * Opens a source of the batches a rebuild reads.
   * @param signal Abort signal of the rebuild.
   * @returns The source.
   */
  abstract batches(signal?: AbortSignal): BloomRebuildSource;
}
