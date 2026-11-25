import type { ConfigEnv } from '@platform/config';
import type { RuntimeAdapters } from './platform-runtime-options.js';

/** Environment variables that decide which infrastructure adapters are registered. */
enum RuntimeAdapterVariable {
  ValkeyUrl = 'VALKEY_URL',
  ValkeyHost = 'VALKEY_HOST',
  AwsRegion = 'AWS_REGION',
}

/**
 * Infers from the environment variables which adapters to enable. A blank value counts as
 * absent, because a deployment may leave the variable defined with no content. The service's explicit
 * options win over what the environment infers.
 */
export class RuntimeAdapterSelector {
  select(
    env: ConfigEnv,
    overrides: Partial<RuntimeAdapters> = {},
  ): RuntimeAdapters {
    const valkey =
      RuntimeAdapterSelector.present(env[RuntimeAdapterVariable.ValkeyUrl]) ||
      RuntimeAdapterSelector.present(env[RuntimeAdapterVariable.ValkeyHost]);
    const aws = RuntimeAdapterSelector.present(
      env[RuntimeAdapterVariable.AwsRegion],
    );
    return {
      valkey: overrides.valkey ?? valkey,
      aws: overrides.aws ?? aws,
    };
  }

  private static present(value: string | undefined): boolean {
    return value !== undefined && value.trim() !== '';
  }
}
