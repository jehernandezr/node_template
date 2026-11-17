import { Id, IdGenerator } from '@platform/kernel';

/** Entrega primero los ids dados, en orden, y después los del generador de respaldo. */
export class PresetIdGenerator extends IdGenerator {
  private readonly pending: string[];

  constructor(
    ids: readonly string[],
    private readonly fallback: IdGenerator,
  ) {
    super();
    this.pending = [...ids];
  }

  next(): Id {
    const preset = this.pending.shift();
    return preset === undefined ? this.fallback.next() : Id.from(preset);
  }
}
