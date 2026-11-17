import { identityContract } from '@contracts/identity';
import {
  AwsCredentialsProvider,
  SigV4Signer,
  type AwsCredentials,
} from '@platform/adapters-aws';
import { Secret } from '@platform/config';
import { InternalApiSignerKind } from '@platform/internal-api';
import { ServiceDefinitionValidator } from '@platform/service';
import { identityConfigSchema } from '../config/identity.config.js';
import { identityService } from '../identity.service.js';
import { IdentityTestEnvironment, StaticAppConfig } from './utils/index.js';

/** Credenciales armadas en la prueba: nunca salen del proceso. */
class FixedCredentials extends AwsCredentialsProvider {
  async resolve(): Promise<AwsCredentials> {
    return {
      accessKeyId: ['AKID', 'PRUEBA'].join(''),
      secretAccessKey: ['s', 'k'].join(''),
    };
  }
}

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
      {},
    );

    expect(Secret.is(config.INTERNAL_API_SHARED_SECRET)).toBe(true);
    expect(settings?.secret).toBe(config.INTERNAL_API_SHARED_SECRET.reveal());
    expect(settings?.baseUrls).toEqual({});
    expect(settings?.signer).toBeUndefined();
  });

  it('signs with SigV4 and the role of the service when INTERNAL_API_SIGNER asks for it', () => {
    const config = identityConfigSchema.parse({
      ...IdentityTestEnvironment.build(),
      INTERNAL_API_SIGNER: InternalApiSignerKind.SigV4,
    });
    const credentials = new FixedCredentials();

    const settings = identityService.internalApi?.http?.(
      new StaticAppConfig(config),
      { aws: { credentials, region: 'us-east-1' } },
    );

    expect(settings?.signer).toBeInstanceOf(SigV4Signer);
    expect(() =>
      identityService.internalApi?.http?.(new StaticAppConfig(config), {}),
    ).toThrow(/INTERNAL_API_SIGNER=sigv4/);
  });
});
