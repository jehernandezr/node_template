import { PurgeableStore } from '@platform/kernel';

/** Almacén purgable que guarda los cortes recibidos y devuelve un conteo programable. */
export class RecordingPurgeableStore extends PurgeableStore {
  readonly purgedBefore: Date[] = [];
  purged = 0;

  async purgeCompleted(before: Date): Promise<number> {
    this.purgedBefore.push(before);
    return this.purged;
  }
}
