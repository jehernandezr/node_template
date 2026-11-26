import type { User } from './user.js';

/** Users in the user's shard. */
export abstract class UserRepository {
  /**
   * Stores a new user.
   * @param user User to store.
   */
  abstract insert(user: User): Promise<void>;

  /**
   * Reads a user.
   * @param userId User to read.
   * @returns The user, or `undefined`.
   */
  abstract find(userId: string): Promise<User | undefined>;

  /**
   * Saves the changes of a user.
   * @param user User read earlier and changed.
   * @throws OptimisticLockError if another write changed the user.
   */
  abstract update(user: User): Promise<void>;
}
