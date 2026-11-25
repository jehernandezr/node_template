import { InvalidServiceDefinitionError } from '../errors/invalid-service-definition.error.js';
import { serviceErrorCatalog } from '../errors/service-error-catalog.js';
import { ServiceErrorCode } from '../errors/service-error-code.enum.js';
import { ServiceShutdownTimeoutError } from '../errors/service-shutdown-timeout.error.js';

describe('serviceErrorCatalog', () => {
  it.each(Object.values(ServiceErrorCode))('has an entry for %s', (code) => {
    expect(serviceErrorCatalog.map((entry) => entry.code)).toContain(code);
  });

  it('gives the invalid definition error its code and details', () => {
    const error = new InvalidServiceDefinitionError('identity', 'reason');

    expect(error).toMatchObject({
      code: ServiceErrorCode.InvalidDefinition,
      details: { serviceName: 'identity', reason: 'reason' },
    });
  });

  it('gives the shutdown timeout error its code and details', () => {
    const error = new ServiceShutdownTimeoutError('identity', 10_000);

    expect(error).toMatchObject({
      code: ServiceErrorCode.ShutdownTimeout,
      details: { serviceName: 'identity', graceMs: 10_000 },
    });
  });
});
