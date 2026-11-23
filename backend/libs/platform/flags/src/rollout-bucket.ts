import { createHash } from 'node:crypto';

/**
 * Asigna un usuario a una cubeta de 0 a 99 por flag. El hash de `flag:usuario` es estable entre procesos y
 * despliegues, así que subir el porcentaje solo suma usuarios: nadie que ya lo tenía lo pierde.
 */
export class RolloutBucket {
  private static readonly BUCKETS = 100;

  static of(flag: string, userId: string): number {
    const digest = createHash('sha256').update(`${flag}:${userId}`).digest();
    return digest.readUInt32BE(0) % RolloutBucket.BUCKETS;
  }
}
