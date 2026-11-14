import { fnv1a32 } from '@platform/primitives';
import { ShardingError } from './errors/sharding-error.js';
import { ShardingErrorCode } from './errors/sharding-error-code.enum.js';

/**
 * Posición en el anillo. FNV-1a sola agrupa los sufijos secuenciales (`nodo#0`, `nodo#1`, ...),
 * así que su salida pasa por el finalizador de murmur3 para repartir los puntos de forma pareja.
 */
function ringPosition(input: string): number {
  let hash = fnv1a32(input);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

interface RingPoint {
  readonly hash: number;
  readonly node: string;
}

function comparePoints(a: RingPoint, b: RingPoint): number {
  if (a.hash !== b.hash) {
    return a.hash - b.hash;
  }
  return a.node < b.node ? -1 : a.node > b.node ? 1 : 0;
}

/** Anillo de hash consistente con nodos virtuales. Una clave pertenece al primer punto en sentido horario desde su hash. */
export class ConsistentHashRing {
  private readonly virtualNodes: number;
  private readonly members = new Set<string>();
  private points: RingPoint[] = [];

  /**
   * @param virtualNodes Puntos por nodo en el anillo. Por defecto 128.
   * @throws ShardingError `InvalidConfiguration` cuando `virtualNodes` no es un entero positivo.
   */
  constructor(virtualNodes = 128) {
    if (!Number.isInteger(virtualNodes) || virtualNodes < 1) {
      throw new ShardingError(
        ShardingErrorCode.InvalidConfiguration,
        'virtualNodes must be a positive integer',
      );
    }
    this.virtualNodes = virtualNodes;
  }

  /** Agrega un nodo. Agregar uno que ya existe no hace nada. */
  add(node: string): void {
    if (this.members.has(node)) {
      return;
    }
    this.members.add(node);
    for (let i = 0; i < this.virtualNodes; i++) {
      this.points.push({ hash: ringPosition(`${node}#${i}`), node });
    }
    this.points.sort(comparePoints);
  }

  /** Quita un nodo. Quitar uno desconocido no hace nada. */
  remove(node: string): void {
    if (!this.members.delete(node)) {
      return;
    }
    this.points = this.points.filter((point) => point.node !== node);
  }

  /** Devuelve el nodo responsable de `key`, o undefined si el anillo está vacío. */
  locate(key: string): string | undefined {
    if (this.points.length === 0) {
      return undefined;
    }
    const hash = ringPosition(key);
    let low = 0;
    let high = this.points.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.points[mid].hash < hash) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    const index = low === this.points.length ? 0 : low;
    return this.points[index].node;
  }

  /** Devuelve los nodos actuales, ordenados. */
  nodes(): string[] {
    return [...this.members].sort();
  }
}
