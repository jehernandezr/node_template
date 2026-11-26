import {
  type EventDefinition,
  MessageKind,
} from '../contracts/message-contract.js';
import { RouteDef } from './route-def.js';
import { TargetKind } from './target-kind.enum.js';
import type { TopicDef } from './topic-def.js';

/** Second step of `Route.event(...)`. */
export class EventRouteBuilder {
  private readonly type: string;
  private readonly contract: EventDefinition | null;

  constructor(source: string | EventDefinition) {
    this.type = typeof source === 'string' ? source : source.type;
    this.contract = typeof source === 'string' ? null : source;
  }

  /**
   * Publishes this event type to a topic.
   * @param topic Target topic.
   * @returns The route.
   */
  to(topic: TopicDef): RouteDef {
    return new RouteDef(
      MessageKind.Event,
      this.type,
      topic,
      TargetKind.Topic,
      this.contract,
    );
  }
}
