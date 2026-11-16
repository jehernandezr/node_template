import { IdGenerator, SystemClock, UuidV7IdGenerator } from '@platform/kernel';
import { CanonicalJson } from '@platform/primitives';
import type { CachePort } from './cache-port.js';
import { CacheInvalidArgumentError } from './errors/cache-invalid-argument.error.js';
import { CacheKeyTooLongError } from './errors/cache-key-too-long.error.js';
import { CacheGuard } from './errors/cache-guard.js';
import type { VersionedKeyspaceOptions } from './versioned-keyspace.options.js';

/**
 * Arma llaves de caché que llevan un token de versión por espacio de nombres.
 * Cambiar el token deja inalcanzables de golpe todas las llaves emitidas antes.
 *
 * Los tokens son aleatorios y nunca salen de un contador. Si la llave de versión
 * desaparece, se crea un token nuevo, así que los datos escritos con el token
 * viejo no pueden volver.
 *
 * Concurrencia: el primer uso crea el token con `setIfAbsent` y lo vuelve a leer,
 * así que los primeros lectores concurrentes acuerdan un solo token. Un cambio
 * escribe un token nuevo; un lector que tomó el token viejo solo puede escribir
 * bajo la llave vieja, que ningún lector posterior volverá a construir.
 */
export class VersionedKeyspace {
  /** Largo máximo por defecto de cualquier llave, en caracteres. */
  static readonly DEFAULT_MAX_KEY_LENGTH = 512;

  /** Forma de un token de versión: un UUID. Cualquier otro valor se reemplaza. */
  private static readonly TOKEN_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  private readonly prefix: string;
  private readonly maxKeyLength: number;
  private readonly ids: IdGenerator;

  constructor(
    private readonly cache: CachePort,
    options: VersionedKeyspaceOptions = {},
  ) {
    const prefix = options.prefix ?? 'cache';
    if (prefix === '' || prefix.includes(':')) {
      throw new CacheInvalidArgumentError(
        'prefix',
        'a non-empty string without ":"',
      );
    }
    this.prefix = prefix;
    this.maxKeyLength = CacheGuard.instance.positiveInteger(
      'maxKeyLength',
      options.maxKeyLength ?? VersionedKeyspace.DEFAULT_MAX_KEY_LENGTH,
    );
    // El reloj del sistema solo entra cuando el llamador no trae su propio generador (uso sin NestJS).
    this.ids = options.ids ?? new UuidV7IdGenerator(new SystemClock());
  }

  /** Token de versión actual de un espacio de nombres. Se crea en el primer uso. */
  async version(namespace: readonly string[]): Promise<string> {
    const key = this.versionKey(namespace);
    const existing = await this.cache.get(key);
    if (
      existing !== undefined &&
      VersionedKeyspace.TOKEN_PATTERN.test(existing)
    ) {
      return existing;
    }
    if (existing !== undefined) {
      // Un token corrupto o ajeno produciría llaves de largo sin límite: se reemplaza.
      return this.bump(namespace);
    }
    await this.cache.setIfAbsent(key, this.token());
    // Otro escritor pudo ganar la carrera: se lee el token que quedó guardado.
    const stored = await this.cache.get(key);
    // Si desapareció (expulsión), un token desechable deja esta lectura sin caché.
    return stored !== undefined && VersionedKeyspace.TOKEN_PATTERN.test(stored)
      ? stored
      : this.token();
  }

  /** Reemplaza el token de versión. Devuelve el token nuevo. */
  async bump(namespace: readonly string[]): Promise<string> {
    const token = this.token();
    await this.cache.set(this.versionKey(namespace), token);
    return token;
  }

  /**
   * Llave de caché para `params` bajo el token actual del espacio de nombres.
   * @throws CacheKeyTooLongError cuando el espacio de nombres hace la llave demasiado larga.
   * @throws NonJsonValueError (primitives) cuando `params` no es JSON canónico.
   */
  async key(namespace: readonly string[], params: unknown): Promise<string> {
    // Se valida antes de tocar el almacén, para que una llamada mala no cueste un viaje.
    const encoded = this.encodedNamespace(namespace);
    const digest = CanonicalJson.digest(params);
    const token = await this.version(namespace);
    return this.bounded(`${this.prefix}:data:${encoded}:v${token}:${digest}`);
  }

  private token(): string {
    return this.ids.next().toString();
  }

  private versionKey(namespace: readonly string[]): string {
    return this.bounded(
      `${this.prefix}:ver:${this.encodedNamespace(namespace)}`,
    );
  }

  /**
   * Codifica cada segmento para que uno con ':' no choque con otro espacio de
   * nombres, y rechaza los espacios que no caben en una llave.
   */
  private encodedNamespace(namespace: readonly string[]): string {
    if (!Array.isArray(namespace)) {
      throw new CacheInvalidArgumentError('namespace', 'an array of strings');
    }
    const encoded = namespace
      .map((segment) => {
        if (typeof segment !== 'string') {
          throw new CacheInvalidArgumentError(
            'namespace',
            'an array of strings',
          );
        }
        // Codificar nunca acorta un segmento: los enormes se rechazan antes de codificar.
        this.bounded(segment);
        return encodeURIComponent(segment);
      })
      .join(':');
    return this.bounded(encoded);
  }

  private bounded(key: string): string {
    if (key.length > this.maxKeyLength) {
      throw new CacheKeyTooLongError(key.length, this.maxKeyLength);
    }
    return key;
  }
}
