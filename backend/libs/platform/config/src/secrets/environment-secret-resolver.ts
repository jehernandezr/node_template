import type { ConfigEnv } from '../config-env.js';
import { ConfigValidationError } from '../errors/config-validation.error.js';
import type { SecretSource } from '../ports/secret-source.js';
import { SecretsMap } from './secrets-map.js';

/**
 * Fills the variables that `SECRETS_MAP` names with the current values of their secrets, before the configuration
 * is validated. A process started without `SECRETS_MAP` keeps its environment as it is.
 */
export class EnvironmentSecretResolver {
  constructor(private readonly source: SecretSource) {}

  /**
   * Returns the environment with the value of every variable of `SECRETS_MAP`.
   * @param env Environment of the process.
   * @returns A new environment with the secret values added; `env` itself when there is no `SECRETS_MAP`.
   * @throws ConfigValidationError (`PLATFORM.CONFIG.INVALID`) if `SECRETS_MAP` is invalid or names a variable that
   *   the environment already sets.
   * @throws Error if a secret cannot be read.
   */
  async resolve(env: ConfigEnv): Promise<ConfigEnv> {
    const raw = env[SecretsMap.VARIABLE];
    if (raw === undefined || raw.trim() === '') {
      return env;
    }
    const { references } = SecretsMap.parse(raw);
    const repeated = references.filter(
      (reference) => (env[reference.variable] ?? '') !== '',
    );
    if (repeated.length > 0) {
      throw new ConfigValidationError(
        repeated.map((reference) => ({
          path: `${SecretsMap.VARIABLE}.${reference.variable}`,
          code: 'custom',
          message: 'the environment already sets this variable',
        })),
      );
    }
    const values = await this.source.read(references);
    return { ...env, ...Object.fromEntries(values) };
  }
}
