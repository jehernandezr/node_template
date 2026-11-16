import { InvalidServiceDefinitionError } from '../errors/invalid-service-definition.error.js';
import { ServiceErrorCode } from '../errors/service-error-code.enum.js';
import type { ServiceDefinition } from '../service-definition.js';
import { ServiceDefinitionValidator } from '../service-definition-validator.js';
import { ServiceInternalTransport } from '../service-internal-api.js';
import { ServiceDefinitionBuilder } from './utils/service-definition.builder.js';

describe('ServiceDefinitionValidator', () => {
  const validator = new ServiceDefinitionValidator();
  const base = ServiceDefinitionBuilder.aDefinition('identity').build();

  /** El contrato valida su nombre al crearse; para un nombre inválido se copia el contrato sin pasar por él. */
  const withName = (name: string): ServiceDefinition => ({
    ...base,
    name,
    contract: { ...base.contract, service: name },
  });

  it('accepts a consistent definition', () => {
    expect(() => validator.validate(base)).not.toThrow();
  });

  it('accepts the HTTP internal API when its settings are declared', () => {
    const definition: ServiceDefinition = {
      ...base,
      internalApi: {
        transport: ServiceInternalTransport.Http,
        http: () => ({ baseUrls: {}, secret: 'secreto-de-prueba' }),
      },
    };

    expect(() => validator.validate(definition)).not.toThrow();
  });

  it('rejects an invalid definition with InvalidServiceDefinitionError', () => {
    expect(() => validator.validate({ ...base, name: 'otro' })).toThrow(
      InvalidServiceDefinitionError,
    );
  });

  it.each<[string, ServiceDefinition]>([
    ['an empty name', withName('')],
    ['a blank name', withName('   ')],
    ['a name that differs from contract.service', { ...base, name: 'otro' }],
    ['a root module that is not a class', { ...base, rootModule: {} as never }],
    [
      'an HTTP internal API without settings',
      {
        ...base,
        internalApi: { transport: ServiceInternalTransport.Http },
      },
    ],
  ])(
    'rejects %s with the invalid definition code',
    async (_label, definition) => {
      await expect(
        Promise.resolve().then(() => validator.validate(definition)),
      ).rejects.toMatchObject({ code: ServiceErrorCode.InvalidDefinition });
    },
  );
});
