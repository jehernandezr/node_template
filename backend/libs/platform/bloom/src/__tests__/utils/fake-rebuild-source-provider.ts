import { BloomRebuildSourceProvider } from '../../bloom-rebuild-source-provider.js';
import type { BloomRebuildSource } from '../../bloom-rebuild-source.js';

/**
 * Test source. No required arguments so Nest can instantiate it as a provider: that is why it
 * has no decorators, so no parameter metadata is emitted that Nest would try to resolve.
 */
export class FakeRebuildSourceProvider extends BloomRebuildSourceProvider {
  /** Times a new source was requested. */
  calls = 0;

  constructor(
    private readonly items: readonly (readonly string[])[] = [
      ['ana@example.com', 'luis@example.com'],
    ],
    private readonly failure?: Error,
  ) {
    super();
  }

  batches(): BloomRebuildSource {
    this.calls += 1;
    return this.generate();
  }

  /** Yields the batches; if there is a `failure`, throws when reading starts. */
  private async *generate(): AsyncGenerator<readonly string[]> {
    if (this.failure !== undefined) {
      throw this.failure;
    }
    for (const batch of this.items) {
      yield batch;
    }
  }
}
