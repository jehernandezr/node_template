import type { User } from './user.js';

/** Users in the user's shard. */
export abstract class UserRepository {
  abstract insert(user: User): Promise<void>;

  abstract find(userId: string): Promise<User | undefined>;

  /** @throws OptimisticLockError if another write changed the user. */
  abstract update(user: User): Promise<void>;
}
