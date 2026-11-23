/**
 * Estado de los bloqueos de inicio de sesión: nivel y fin del bloqueo de cada origen, bloqueo de IP y modo
 * protegido de cada cuenta. Los fallos los cuenta `AttemptCounters`.
 */
export abstract class LockoutStore {
  /** Milisegundos que faltan del bloqueo del origen o de la IP, el mayor; `undefined` sin bloqueo. */
  abstract remainingLockMs(
    origin: string,
    ip: string,
  ): Promise<number | undefined>;

  abstract isProtected(account: string): Promise<boolean>;

  /** Sube el nivel de bloqueo del origen y devuelve el nuevo, desde 1. El nivel olvida tras `ttlMs`. */
  abstract raiseLevel(origin: string, ttlMs: number): Promise<number>;

  abstract lockOrigin(origin: string, lockMs: number): Promise<void>;

  abstract lockIp(ip: string, lockMs: number): Promise<void>;

  /** Activa el modo protegido de la cuenta. `true` si no estaba activo. */
  abstract protect(account: string, ttlMs: number): Promise<boolean>;

  /**
   * Época de desbloqueo de la cuenta. Forma parte de la llave de cada origen, así que subirla deja atrás
   * los bloqueos y los contadores de todos sus orígenes sin tener que buscarlos.
   */
  abstract unlockEpoch(account: string): Promise<number>;

  /** Sube la época de desbloqueo, que vive `ttlMs` desde ahora, y quita el modo protegido. */
  abstract unlock(account: string, ttlMs: number): Promise<void>;

  /** Alarga la época vigente para que viva `ttlMs` más: los bloqueos recién escritos con ella siguen viéndose. */
  abstract retainEpoch(account: string, ttlMs: number): Promise<void>;
}
