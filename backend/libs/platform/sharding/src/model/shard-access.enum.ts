/** Intención de una petición. Leer siempre se permite; escribir exige un tenant `Active`. */
export enum ShardAccess {
  Read = 'read',
  Write = 'write',
}
