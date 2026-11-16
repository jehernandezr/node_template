import type {
  CommandDefinition,
  EventDefinition,
} from '../contracts/message-contract.js';
import { CommandRouteBuilder } from './command-route-builder.js';
import { EventRouteBuilder } from './event-route-builder.js';

/**
 * Arma rutas dentro de la librería. Los servicios obtienen las suyas de los
 * contratos con `topologyFromContracts`.
 */
export class Route {
  /**
   * Empieza la ruta de un evento del kit de contratos (`defineEvent`). Acepta
   * el tipo como texto para las pruebas de validación; la validación pide
   * entonces su contrato en `ValidateOptions.contracts`.
   */
  static event(source: string | EventDefinition): EventRouteBuilder {
    return new EventRouteBuilder(source);
  }

  /** Empieza la ruta de un comando del kit de contratos (`defineCommand`). */
  static command(source: string | CommandDefinition): CommandRouteBuilder {
    return new CommandRouteBuilder(source);
  }
}
