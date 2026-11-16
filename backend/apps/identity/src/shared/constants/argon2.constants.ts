/** Parámetros de argon2id (OWASP): 19 456 KiB de memoria, 2 pasadas, paralelismo 1. */
export const Argon2Params = {
  version: 19,
  memoryKiB: 19_456,
  passes: 2,
  parallelism: 1,
  saltBytes: 16,
  tagBytes: 32,
} as const;
