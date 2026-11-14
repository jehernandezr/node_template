import { Hashes } from './hashing/hashes.js';

/** @deprecated Usa `Hashes.fnv1a32`. */
export function fnv1a32(input: string | Uint8Array): number {
  return Hashes.fnv1a32(input);
}

/** @deprecated Usa `Hashes.fnv1a32Hex`. */
export function fnv1a32Hex(input: string | Uint8Array): string {
  return Hashes.fnv1a32Hex(input);
}
