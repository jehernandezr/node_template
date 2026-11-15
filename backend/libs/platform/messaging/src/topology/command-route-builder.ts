import {
  type CommandDefinition,
  MessageKind,
} from '../contracts/message-contract.js';
import type { QueueDef } from './queue-def.js';
import { RouteDef } from './route-def.js';
import { TargetKind } from './target-kind.enum.js';

/** Segundo paso de `Route.command(...)`. */
export class CommandRouteBuilder {
  private readonly type: string;
  private readonly contract: CommandDefinition | null;

  constructor(source: string | CommandDefinition) {
    this.type = typeof source === 'string' ? source : source.type;
    this.contract = typeof source === 'string' ? null : source;
  }

  /** Envía este tipo de comando a una cola. */
  to(queue: QueueDef): RouteDef {
    return new RouteDef(
      MessageKind.Command,
      this.type,
      queue,
      TargetKind.Queue,
      this.contract,
    );
  }
}
