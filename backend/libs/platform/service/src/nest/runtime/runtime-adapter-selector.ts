import type { ConfigEnv } from '@platform/config';
import type { RuntimeAdapters } from './platform-runtime-options.js';

/** Variables de entorno que deciden qué adaptadores de infraestructura se registran. */
enum RuntimeAdapterVariable {
  ValkeyUrl = 'VALKEY_URL',
  ValkeyHost = 'VALKEY_HOST',
  AwsRegion = 'AWS_REGION',
}

/**
 * Deduce de las variables de entorno qué adaptadores activar. Un valor en blanco cuenta como
 * ausente, porque un despliegue puede dejar la variable definida sin contenido. Las opciones
 * explícitas del servicio ganan sobre lo que deduce el entorno.
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
