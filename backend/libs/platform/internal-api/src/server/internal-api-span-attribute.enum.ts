/** Atributos del span de servidor de cada llamada. */
export enum InternalApiSpanAttribute {
  /** Sistema RPC (convenciones semánticas de OpenTelemetry). */
  RpcSystem = 'rpc.system',
  /** Id de la operación. */
  RpcMethod = 'rpc.method',
  /** `CallOutcomeKind` de la llamada. */
  Outcome = 'platform.call.outcome',
}

/** Valor de `rpc.system` para las llamadas de la API interna. */
export enum InternalApiRpcSystem {
  Value = 'platform.internal-api',
}
