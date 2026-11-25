import { InvalidServiceDefinitionError } from './errors/invalid-service-definition.error.js';
import type { ServiceDefinition } from './service-definition.js';
import { ServiceInternalTransport } from './service-internal-api.js';

/** Checks that a `ServiceDefinition` is consistent before building anything with it. */
export class ServiceDefinitionValidator {
  private static readonly EMPTY_NAME = 'el nombre del servicio está vacío';
  private static readonly NAME_MISMATCH =
    'el nombre no coincide con contract.service';
  private static readonly ROOT_MODULE_NOT_CLASS =
    'rootModule debe ser la clase del módulo raíz';
  private static readonly HTTP_SETTINGS_MISSING =
    'la API interna por HTTP necesita la opción http';

  /**
   * @throws InvalidServiceDefinitionError when the name is empty or does not match `contract.service`,
   * when `rootModule` is not a class or when the HTTP internal API does not declare its configuration.
   */
  validate(definition: ServiceDefinition): void {
    if (typeof definition.name !== 'string' || definition.name.trim() === '') {
      throw new InvalidServiceDefinitionError(
        definition.name,
        ServiceDefinitionValidator.EMPTY_NAME,
      );
    }
    if (definition.name !== definition.contract.service) {
      throw new InvalidServiceDefinitionError(
        definition.name,
        ServiceDefinitionValidator.NAME_MISMATCH,
      );
    }
    if (typeof definition.rootModule !== 'function') {
      throw new InvalidServiceDefinitionError(
        definition.name,
        ServiceDefinitionValidator.ROOT_MODULE_NOT_CLASS,
      );
    }
    if (
      definition.internalApi?.transport === ServiceInternalTransport.Http &&
      definition.internalApi.http === undefined
    ) {
      throw new InvalidServiceDefinitionError(
        definition.name,
        ServiceDefinitionValidator.HTTP_SETTINGS_MISSING,
      );
    }
  }
}
