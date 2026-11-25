/** How a call reaches the service that owns the operation. */
export enum InternalTransportKind {
  /** Over signed HTTP to another process. */
  Http = 'http',
  /** Directly to the router of the same process; it is the local mode and the test mode. */
  InProcess = 'in-process',
}
