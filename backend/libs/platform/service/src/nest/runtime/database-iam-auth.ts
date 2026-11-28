import type { ConfigEnv } from '@platform/config';
import { DatabaseAuth } from '@platform/persistence';
import { InvalidServiceDefinitionError } from '../../errors/invalid-service-definition.error.js';

/** Environment variable that picks how the pool authenticates. */
enum DatabaseAuthVariable {
  Auth = 'DB_AUTH',
}

/**
 * Decides, while composing the modules and before the configuration context exists, whether the pool signs IAM
 * tokens (`DB_AUTH=iam`). The signer comes from `AwsModule`, so IAM needs the AWS adapter.
 */
export class DatabaseIamAuth {
  /**
   * Whether the environment asks for IAM database authentication.
   * @param serviceName Service name, for the error.
   * @param env Environment variables.
   * @param aws Whether the AWS adapter is registered.
   * @returns True with `DB_AUTH=iam`.
   * @throws InvalidServiceDefinitionError with `DB_AUTH=iam` and no AWS adapter (`AWS_REGION` unset).
   */
  static required(serviceName: string, env: ConfigEnv, aws: boolean): boolean {
    if (env[DatabaseAuthVariable.Auth] !== DatabaseAuth.Iam) {
      return false;
    }
    if (!aws) {
      throw new InvalidServiceDefinitionError(
        serviceName,
        'DB_AUTH=iam signs tokens with the AWS adapter, which needs AWS_REGION',
      );
    }
    return true;
  }
}
