import { createHash } from 'node:crypto';

/**
 * A Lua script. It is sent with `EVALSHA` and, if the server does not have it
 * cached, with `EVAL` (run by `ValkeyCommandExecutor.script`). A script runs
 * atomically on the server.
 */
export class LuaScript {
  /** SHA-1 of the code, the name Valkey gives the script. It is not a security hash. */
  readonly sha: string;

  constructor(readonly source: string) {
    this.sha = createHash('sha1').update(source).digest('hex');
  }
}
