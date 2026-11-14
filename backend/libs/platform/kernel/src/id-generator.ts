import { randomFillSync } from 'node:crypto';
import { Id } from './id.js';

/** Puerto para generar identificadores. */
export interface IdGenerator {
  next(): Id;
}

/** Mayor valor del contador de 12 bits de `rand_a`. */
const MAX_COUNTER = 0xfff;

/**
 * Genera UUIDv7 (RFC 9562): 48 bits de milisegundos epoch, versión, 12 bits de
 * contador y 62 bits aleatorios. Dentro del mismo milisegundo el contador sube,
 * así los ids de un proceso salen ordenados; si se agota, o si el reloj
 * retrocede, el instante sigue al último usado en lugar de repetir el orden.
 */
export class UuidV7IdGenerator implements IdGenerator {
  private lastMs = -1;
  private counter = 0;

  constructor(private readonly nowMs: () => number = Date.now) {}

  next(): Id {
    return Id.from(this.generate());
  }

  private generate(): string {
    const random = randomFillSync(new Uint8Array(10));
    let ms = this.nowMs();
    if (ms > this.lastMs) {
      // El contador arranca en la mitad baja para dejar margen de subida.
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
