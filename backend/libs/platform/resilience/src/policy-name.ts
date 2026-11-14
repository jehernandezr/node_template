/** Names of the outbound adapters that have a resilience policy. */
export enum ResiliencePolicyName {
  Database = 'database',
  Cache = 'cache',
  ExternalApi = 'external-api',
  Ai = 'ai',
  AiStreaming = 'ai-streaming',
  Email = 'email',
  Queue = 'queue',
}

/** Kinds of events emitted by the resilience policies. */
export enum ResilienceEventKind {
  Retry = 'retry',
  Break = 'break',
  HalfOpen = 'half-open',
  Reset = 'reset',
  Timeout = 'timeout',
  BulkheadRejected = 'bulkhead-rejected',
}
