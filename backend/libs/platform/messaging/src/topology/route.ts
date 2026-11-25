import type {
  CommandDefinition,
  EventDefinition,
} from '../contracts/message-contract.js';
import { CommandRouteBuilder } from './command-route-builder.js';
import { EventRouteBuilder } from './event-route-builder.js';

/**
 * Builds routes inside the library. Services get theirs from the
 * contracts with `topologyFromContracts`.
 */
export class Route {
  /**
   * Starts the route of an event from the contracts kit (`defineEvent`). Accepts
   * the type as text for validation tests; the validation then asks
   * for its contract in `ValidateOptions.contracts`.
   */
  static event(source: string | EventDefinition): EventRouteBuilder {
    return new EventRouteBuilder(source);
  }

  /** Starts the route of a command from the contracts kit (`defineCommand`). */
  static command(source: string | CommandDefinition): CommandRouteBuilder {
    return new CommandRouteBuilder(source);
  }
}
