/**
 * Kind of a failure, shared by resilience, messaging, internal-api and saga.
 * - `Transient`: retrying the same call may work.
 * - `Permanent`: repeating it gives the same result (business rule, 4xx, missing resource).
 * - `ProtocolViolation`: broken contract or implementation fault. Never retried.
 * - `Timeout`: time ran out; the effect may or may not have been applied.
 * - `Cancelled`: the caller aborted; the effect may or may not have been applied.
 */
export enum FailureKind {
  Transient = 'transient',
  Permanent = 'permanent',
  ProtocolViolation = 'protocol-violation',
  Timeout = 'timeout',
  Cancelled = 'cancelled',
}
