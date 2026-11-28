import {
  ConfigValidationError,
  DeployEnvironment,
  type ConfigEnv,
} from '@platform/config';
import type { RuntimeAdapters } from './platform-runtime-options.js';

/** Environment variables that decide which infrastructure adapters are registered. */
enum RuntimeAdapterVariable {
  ValkeyUrl = 'VALKEY_URL',
  ValkeyHost = 'VALKEY_HOST',
  AwsRegion = 'AWS_REGION',
  DeployEnvironment = 'DEPLOY_ENVIRONMENT',
}

/**
 * Infers from the environment variables which adapters to enable. A blank value counts as
 * absent, because a deployment may leave the variable defined with no content. The service's explicit
 * options win over what the environment infers. Outside `local` Valkey is required: without it the runtime would
 * start with a routing cache that stores nothing and a directory channel that reaches no other instance.
 */
export class RuntimeAdapterSelector {
  /**
   * Picks the routing cache and directory channel adapters from the environment.
   * @param env Environment variables.
   * @param overrides Adapters a test replaces.
   * @returns The adapters.
   * @throws ConfigValidationError when a deployed environment (`DEPLOY_ENVIRONMENT` other than `local`) has no Valkey.
   */
  select(
    env: ConfigEnv,
    overrides: Partial<RuntimeAdapters> = {},
  ): RuntimeAdapters {
    const valkey =
      RuntimeAdapterSelector.present(env[RuntimeAdapterVariable.ValkeyUrl]) ||
      RuntimeAdapterSelector.present(env[RuntimeAdapterVariable.ValkeyHost]);
    const aws = this.awsConfigured(env);
    const adapters = {
      valkey: overrides.valkey ?? valkey,
      aws: overrides.aws ?? aws,
    };
    RuntimeAdapterSelector.requireValkeyWhenDeployed(env, adapters);
    return adapters;
  }

  /**
   * Whether the environment configures the AWS adapter, which it does with `AWS_REGION`.
   * @param env Environment variables.
   * @returns True when `AWS_REGION` has a value.
   */
  awsConfigured(env: ConfigEnv): boolean {
    return RuntimeAdapterSelector.present(
      env[RuntimeAdapterVariable.AwsRegion],
    );
  }

  private static requireValkeyWhenDeployed(
    env: ConfigEnv,
    adapters: RuntimeAdapters,
  ): void {
    const environment =
      env[RuntimeAdapterVariable.DeployEnvironment] ?? DeployEnvironment.Local;
    if (environment === DeployEnvironment.Local || adapters.valkey) {
      return;
    }
    throw new ConfigValidationError([
      {
        path: RuntimeAdapterVariable.ValkeyHost,
        code: 'custom',
        message: `is required outside ${RuntimeAdapterVariable.DeployEnvironment}=${DeployEnvironment.Local}`,
      },
    ]);
  }

  private static present(value: string | undefined): boolean {
    return value !== undefined && value.trim() !== '';
  }
}
