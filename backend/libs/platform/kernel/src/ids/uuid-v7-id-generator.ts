import type { RandomSource } from '../random/random-source.js';
import type { Clock } from '../time/clock.js';
import { Id } from './id.js';
import { IdGenerator } from './id-generator.js';

/** Highest value of the 12-bit `rand_a` counter. */
const MAX_COUNTER = 0xfff;

/**
 * Generates UUIDv7 (RFC 9562): 48 bits of epoch milliseconds, version, 12 bits of
 * counter and 62 random bits. Within the same millisecond the counter goes up,
 * so the ids of a process come out ordered; if it runs out, or if the clock
 * goes back, the instant follows the last one used instead of repeating the order.
 */
export class UuidV7IdGenerator extends IdGenerator {
  private lastMs = -1;
  private counter = 0;

  constructor(
    private readonly clock: Clock,
    private readonly random: RandomSource,
  ) {
    super();
  }

  next(): Id {
    return Id.from(this.generate());
  }

  private generate(): string {
    const random = this.random.bytes(10);
    let ms = this.clock.now().getTime();
    if (ms > this.lastMs) {
      // The counter starts in the lower half to leave room to go up.
      this.counter = ((random[0] << 4) | (random[1] >> 4)) & 0x7ff;
    } else {
      ms = this.lastMs;
      this.counter += 1;
      if (this.counter > MAX_COUNTER) {
        ms += 1;
        this.counter = 0;
      }
    }
    this.lastMs = ms;

    const bytes = new Uint8Array(16);
    let time = ms;
    for (let index = 5; index >= 0; index -= 1) {
      bytes[index] = time % 256;
      time = Math.floor(time / 256);
    }
    bytes[6] = 0x70 | (this.counter >> 8);
    bytes[7] = this.counter & 0xff;
    bytes.set(random.subarray(2), 8);
    bytes[8] = 0x80 | (bytes[8] & 0x3f);

    const hex = Buffer.from(bytes).toString('hex');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join('-');
  }
}
