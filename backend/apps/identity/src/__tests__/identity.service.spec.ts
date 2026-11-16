import { identityContract } from '@contracts/identity';
import { Secret } from '@platform/config';
import { ServiceDefinitionValidator } from '@platform/service';
import { identityConfigSchema } from '../config/identity.config.js';
import { identityService } from '../identity.service.js';
import { IdentityTestEnvironment, StaticAppConfig } from './utils/index.js';

describe('identityService', () => {
  it('passes the service definition validation', () => {
    expect(() =>
      new ServiceDefinitionValidator().validate(identityService),
    ).not.toThrow();
  });

  it('is named after the contract', () => {
    expect(identityService.name).toBe(identityContract.service);
  });

  it('requires a shard scope for every operation', () => {
    expect(identityService.sharding?.requireScope).toBe(true);
  });

  it('takes the internal API secret from the configuration', () => {
    const config = identityConfigSchema.parse(IdentityTestEnvironment.build());

    const settings = identityService.internalApi?.http?.(
      new StaticAppConfig(config),
    );

    expect(Secret.is(config.INTERNAL_API_SHARED_SECRET)).toBe(true);
    expect(settings?.secret).toBe(config.INTERNAL_API_SHARED_SECRET.reveal());
    expect(settings?.baseUrls).toEqual({});
  });
});
