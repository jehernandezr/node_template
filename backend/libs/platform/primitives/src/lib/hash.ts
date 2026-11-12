const FNV_OFFSET_BASIS_32 = 0x811c9dc5;
const FNV_PRIME_32 = 0x01000193;

const encoder = new TextEncoder();

/**
 * FNV-1a de 32 bits sobre los bytes UTF-8 de `input` (o sobre los bytes dados).
 * Rápido y estable entre procesos, pero no criptográfico: no sirve para llaves
 * de idempotencia ni para nada que un atacante pueda forzar a colisionar.
 * @returns Entero sin signo en `[0, 2^32)`.
 */
export function fnv1a32(input: string | Uint8Array): number {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input;
  let hash = FNV_OFFSET_BASIS_32;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, FNV_PRIME_32);
  }
  return hash >>> 0;
}

/** FNV-1a de 32 bits como 8 caracteres hexadecimales en minúscula. */
export function fnv1a32Hex(input: string | Uint8Array): string {
  return fnv1a32(input).toString(16).padStart(8, '0');
}
