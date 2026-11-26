import type { Id } from './ids/id.js';

/** Object with identity: two entities are equal if they have the same `id`. */
export abstract class Entity<TId extends Id = Id> {
  protected constructor(readonly id: TId) {}

  /**
   * Compares two entities by identity, not by value.
   * @param other Entity to compare.
   * @returns `true` when they have the same id.
   */
  equals(other: Entity<TId> | null | undefined): boolean {
    return other != null && other.id.equals(this.id);
  }
}
