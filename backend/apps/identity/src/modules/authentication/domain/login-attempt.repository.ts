import type { LoginAttempt } from './login-attempt.js';

/** Bitácora de intentos de inicio de sesión, en el shard del usuario. */
export abstract class LoginAttemptRepository {
  abstract record(attempt: LoginAttempt): Promise<void>;
}
