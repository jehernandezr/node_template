import { Id, IdGenerator } from '@platform/kernel';

/** Yields the given ids first, in order, and then those of the fallback generator. */
export class PresetIdGenerator extends IdGenerator {
  private readonly pending: string[];

  constructor(
    ids: readonly string[],
    private readonly fallback: IdGenerator,
  ) {
    super();
    this.pending = [...ids];
  }

  override next(): Id {
    const preset = this.pending.shift();
    return preset === undefined ? this.fallback.next() : Id.from(preset);
  }
}
