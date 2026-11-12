import type { Id } from './id.js';

/** Objeto con identidad: dos entidades son iguales si tienen el mismo `id`. */
export abstract class Entity<TId extends Id = Id> {
  protected constructor(readonly id: TId) {}

  equals(other: Entity<TId> | null | undefined): boolean {
    return other != null && other.id.equals(this.id);
  }
}
