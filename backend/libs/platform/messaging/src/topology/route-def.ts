import type {
  MessageDefinition,
  MessageKind,
} from '../contracts/message-contract.js';
import type { QueueDef } from './queue-def.js';
import type { TargetKind } from './target-kind.enum.js';
import type { TopicDef } from './topic-def.js';

/** Liga un tipo de mensaje con su destino. */
export class RouteDef {
  readonly kind: MessageKind;
  readonly type: string;
  readonly target: TopicDef | QueueDef;
  readonly targetKind: TargetKind;
  /**
   * Contrato con el que se declaró la ruta. La validación de la topología exige
   * uno (aquí o en `ValidateOptions.contracts`), porque el relay del outbox y el
   * dispatcher validan los payloads con él.
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

  /** Si el destino es un tópico o una cola FIFO (entonces necesita id de grupo). */
  get fifo(): boolean {
    return 'isFifo' in this.target ? this.target.isFifo : this.target.fifo;
  }
}
