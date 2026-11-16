/** Operación del almacén que un doble puede hacer fallar. */
export enum StoreOperation {
  Claim = 'claim',
  Complete = 'complete',
  Release = 'release',
}
