/** Identifica cómo los ítems se mapean a posiciones de bit. Forma parte del formato serializado. */
export enum BloomHashScheme {
  EnhancedDoubleHashing = 'fnv1a32+murmur3_32/edh',
}
