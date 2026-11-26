import type { LoginAttempt } from '../../domain/login-attempt.js';
import { LoginAttemptRepository } from '../../domain/login-attempt.repository.js';

/** Login attempts kept in memory, in the order they were recorded. */
export class InMemoryLoginAttempts extends LoginAttemptRepository {
  readonly recorded: LoginAttempt[] = [];

  override async record(attempt: LoginAttempt): Promise<void> {
    this.recorded.push(attempt);
  }

  override async forget(userId: string): Promise<void> {
    for (let index = this.recorded.length - 1; index >= 0; index -= 1) {
      if (this.recorded[index]?.userId === userId) {
        this.recorded.splice(index, 1);
      }
    }
  }
}
