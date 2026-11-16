import { ConfigValidationError } from '@platform/config';
import type { ValkeySettings } from './valkey.config.js';

/**
 * Primer segmento de cada llave y canal que toca un servicio. En AWS cada
 * usuario de servicio tiene la ACL `~<prefijo>:* &<prefijo>:*`, así que una
 * llave o un canal fuera de `<prefijo>:` falla con `NOPERM`. El prefijo es
 * `VALKEY_KEY_PREFIX` y, sin él, `SERVICE_NAME`.
 */
export class ValkeyKeyspace {
  /** Lo que puede llevar un prefijo: sin `:`, para que `<prefijo>:*` de la ACL cubra justo este espacio. */
  static readonly PREFIX_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

  /**
   * @param source Variable de la que sale el prefijo, para nombrarla en el error.
   * @throws ConfigValidationError con un prefijo vacío, con `:` o con caracteres fuera de `[A-Za-z0-9_-]`.
   */
  constructor(
    readonly prefix: string,
    source = 'keyPrefix',
  ) {
    if (!ValkeyKeyspace.PREFIX_PATTERN.test(prefix)) {
      throw new ConfigValidationError([
        {
          path: source,
          code: 'custom',
          message: 'se esperan de 1 a 64 caracteres en [A-Za-z0-9_-]',
        },
      ]);
    }
  }

  /**
   * Espacio de llaves del servicio: `VALKEY_KEY_PREFIX` si se definió, o el
   * nombre del servicio.
   * @throws ConfigValidationError si el prefijo elegido no cumple {@link ValkeyKeyspace.PREFIX_PATTERN}.
   */
  static fromSettings(
    valkey: Pick<ValkeySettings, 'VALKEY_KEY_PREFIX'>,
    serviceName: string,
  ): ValkeyKeyspace {
    const explicit = valkey.VALKEY_KEY_PREFIX;
    return explicit === undefined
      ? new ValkeyKeyspace(serviceName, 'SERVICE_NAME')
      : new ValkeyKeyspace(explicit, 'VALKEY_KEY_PREFIX');
  }

  /** `<prefijo>:<parte>:<parte>...` */
  key(...parts: readonly string[]): string {
    return [this.prefix, ...parts].join(':');
  }
}
