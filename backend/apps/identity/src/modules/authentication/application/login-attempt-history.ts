import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { LoginAttemptRepository } from '../domain/login-attempt.repository.js';

/** The sign-in history of a user, which keeps the IPs they signed in from. */
@Injectable()
export class LoginAttemptHistory {
  constructor(
    private readonly attempts: LoginAttemptRepository,
    private readonly scopes: ShardScopes,
  ) {}

  /**
   * Deletes the history of a user whose account is being erased. Repeating it changes nothing.
   * @param ref User.
   */
  async forget(ref: UserRef): Promise<void> {
    await this.scopes.inUserShard(ref, () => this.attempts.forget(ref.userId));
  }
}
