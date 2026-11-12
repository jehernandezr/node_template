import { fnv1a32 as primitivesFnv1a32 } from '@platform/primitives';

/**
 * 32-bit FNV-1a hash of the UTF-8 bytes of `input`. Returns an unsigned integer.
 * @deprecated Import `fnv1a32` from `@platform/primitives`. This alias goes away in WP-A phase 2.
 */
export const fnv1a32: (input: string) => number = primitivesFnv1a32;
