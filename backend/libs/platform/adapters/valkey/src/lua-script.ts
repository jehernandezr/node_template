import { createHash } from 'node:crypto';

/**
 * Un script de Lua. Se envía con `EVALSHA` y, si el servidor no lo tiene en
 * caché, con `EVAL` (lo corre `ValkeyCommandExecutor.script`). Un script corre
 * atómico en el servidor.
 */
export class LuaScript {
  /** SHA-1 del código, el nombre que Valkey le da al script. No es un hash de seguridad. */
  readonly sha: string;

  constructor(readonly source: string) {
    this.sha = createHash('sha1').update(source).digest('hex');
  }
}
