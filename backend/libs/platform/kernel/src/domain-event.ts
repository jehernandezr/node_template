import type { Id } from './ids/id.js';

/** Fact that happened in the domain, emitted by an aggregate. */
export interface DomainEvent<TType extends string = string> {
  id: Id;
  /** Event name, for example `identity.user.registered`. Each aggregate defines an enum. */
  type: TType;
  occurredAt: Date;
  aggregateId: string;
  payload: Readonly<Record<string, unknown>>;
}
