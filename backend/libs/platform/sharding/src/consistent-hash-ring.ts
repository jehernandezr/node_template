import { fnv1a32 } from '@platform/primitives';
import { ShardingError, ShardingErrorCode } from './errors.js';

/**
 * Position on the ring. FNV-1a alone clusters for sequential suffixes (`node#0`, `node#1`, ...),
 * so its output is passed through the murmur3 finalizer to spread points evenly.
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

/** Consistent hash ring with virtual nodes. A key belongs to the first point clockwise from its hash. */
export class ConsistentHashRing {
  private readonly virtualNodes: number;
  private readonly members = new Set<string>();
  private points: RingPoint[] = [];

  /**
   * @param virtualNodes Points per node on the ring. Default 128.
   * @throws ShardingError `InvalidConfiguration` when `virtualNodes` is not a positive integer.
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

  /** Adds a node. Adding an existing node is a no-op. */
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

  /** Removes a node. Removing an unknown node is a no-op. */
  remove(node: string): void {
    if (!this.members.delete(node)) {
      return;
    }
    this.points = this.points.filter((point) => point.node !== node);
  }

  /** Returns the node responsible for `key`, or undefined when the ring is empty. */
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

  /** Returns the current nodes, sorted. */
  nodes(): string[] {
    return [...this.members].sort();
  }
}
