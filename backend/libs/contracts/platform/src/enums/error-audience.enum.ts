/**
 * Who can see an error code.
 * `public`: travels to the client in a Problem Details and has a message in the front ARB.
 * `internal`: only between backend processes; the client receives `PLATFORM.INTERNAL.UNEXPECTED`.
 */
export enum ErrorAudience {
  Public = 'public',
  Internal = 'internal',
}
