/** Intent of a request. Reading is always allowed; writing requires an `Active` tenant. */
export enum ShardAccess {
  Read = 'read',
  Write = 'write',
}
