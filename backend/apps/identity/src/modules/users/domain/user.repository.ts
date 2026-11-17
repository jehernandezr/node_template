import type { User } from './user.js';

/** Usuarios en el shard del usuario. */
export abstract class UserRepository {
  abstract insert(user: User): Promise<void>;

  abstract find(userId: string): Promise<User | undefined>;

  /** @throws OptimisticLockError si otra escritura cambió el usuario. */
  abstract update(user: User): Promise<void>;
}
