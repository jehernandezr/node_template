import { InvalidServiceDefinitionError } from './errors/invalid-service-definition.error.js';
import type { ServiceDefinition } from './service-definition.js';
import { ServiceInternalTransport } from './service-internal-api.js';

/** Checks that a `ServiceDefinition` is consistent before building anything with it. */
export class ServiceDefinitionValidator {
  private static readonly EMPTY_NAME = 'the service name is empty';
  private static readonly NAME_MISMATCH =
    'the name does not match contract.service';
  private static readonly ROOT_MODULE_NOT_CLASS =
    'rootModule must be the root module class';
  private static readonly HTTP_SETTINGS_MISSING =
    'the internal HTTP API needs the http option';

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
