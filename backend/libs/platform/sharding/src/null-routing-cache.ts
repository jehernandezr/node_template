import { RoutingCache } from './ports/routing-cache.js';

/**
 * Caché compartido que no guarda nada: toda lectura es un fallo y ninguna
 * escritura se acepta. Es el valor por defecto sin Valkey, así `ShardRouter`
 * siempre consulta el directorio y su caché en proceso.
 */
export class NullRoutingCache extends RoutingCache {
  get(): Promise<string | undefined> {
    return Promise.resolve(undefined);
  }

  setIfNewer(): Promise<boolean> {
    return Promise.resolve(false);
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }
}
