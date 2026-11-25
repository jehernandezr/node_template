/** Attributes of the server span of each call. */
export enum InternalApiSpanAttribute {
  /** RPC system (OpenTelemetry semantic conventions). */
  RpcSystem = 'rpc.system',
  /** Operation id. */
  RpcMethod = 'rpc.method',
  /** `CallOutcomeKind` of the call. */
  Outcome = 'platform.call.outcome',
}

/** Value of `rpc.system` for internal API calls. */
export enum InternalApiRpcSystem {
  Value = 'platform.internal-api',
}
