import type {
  MessageDefinition,
  MessageKind,
} from '../contracts/message-contract.js';
import type { QueueDef } from './queue-def.js';
import type { TargetKind } from './target-kind.enum.js';
import type { TopicDef } from './topic-def.js';

/** Binds a message type to its destination. */
export class RouteDef {
  readonly kind: MessageKind;
  readonly type: string;
  readonly target: TopicDef | QueueDef;
  readonly targetKind: TargetKind;
  /**
   * Contract the route was declared with. The topology validation requires
   * one (here or in `ValidateOptions.contracts`), because the outbox relay and the
   * dispatcher validate payloads with it.
   */
  readonly contract: MessageDefinition | null;

  constructor(
    kind: MessageKind,
    type: string,
    target: TopicDef | QueueDef,
    targetKind: TargetKind,
    contract: MessageDefinition | null = null,
  ) {
    this.kind = kind;
    this.type = type;
    this.target = target;
    this.targetKind = targetKind;
    this.contract = contract;
  }

  /** Whether the destination is a FIFO topic or queue (then it needs a group id). */
  get fifo(): boolean {
    return 'isFifo' in this.target ? this.target.isFifo : this.target.fifo;
  }
}
