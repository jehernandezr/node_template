import { InvalidParametersError } from '@platform/bloom';
import type { IdGenerator } from '@platform/kernel';
import { LuaScript } from './lua-script.js';
import type { ValkeyKeyspace } from './valkey-keyspace.js';

/** Llaves, lotes y scripts de los filtros de Bloom en Valkey. */
export class BloomKeys {
  /** Lo más que vive una llave temporal de reconstrucción si su job muere a medias. */
  static readonly REBUILD_KEY_TTL_MS = 6 * 60 * 60 * 1_000;

  /** Ítems por comando al agregar muchos. */
  static readonly BATCH_SIZE = 1_000;

  private static readonly NAME_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

  /**
   * Pone un filtro reconstruido en su lugar de una vez: renombra la llave
   * temporal sobre la viva y le quita el TTL. KEYS[1] llave temporal, KEYS[2] llave viva.
   */
  static readonly SWAP_REBUILT = new LuaScript(`
redis.call('RENAME', KEYS[1], KEYS[2])
redis.call('PERSIST', KEYS[2])
return 1
`);

  /**
   * Llave de un filtro, `<prefijo>:bloom:{nombre}`. El nombre va en una hash
   * tag, así la llave viva y las de reconstrucción comparten slot en un clúster
   * y el script de intercambio puede tocar ambas.
   * @throws InvalidParametersError con un nombre vacío, con caracteres fuera de `[A-Za-z0-9._:-]` o de más de 128.
   */
  static filter(keyspace: ValkeyKeyspace, name: string): string {
    if (!BloomKeys.NAME_PATTERN.test(name)) {
      throw new InvalidParametersError(
        'name must have 1 to 128 characters in [A-Za-z0-9._:-]',
      );
    }
    return keyspace.key('bloom', `{${name}}`);
  }

  /** Llave temporal que una reconstrucción llena antes del intercambio. */
  static rebuild(liveKey: string, ids: IdGenerator): string {
    return `${liveKey}:rebuild:${ids.next().toString()}`;
  }

  /** Parte los ítems en lotes del tamaño de un comando. */
  static *batches<T>(
    items: readonly T[],
    size: number = BloomKeys.BATCH_SIZE,
  ): Iterable<readonly T[]> {
    for (let start = 0; start < items.length; start += size) {
      yield items.slice(start, start + size);
    }
  }
}
