import { SystemClock } from '@platform/kernel';
import {
  RegistryAppConfig,
  ConfigLoader,
  ConfigRegistry,
} from '@platform/config';
import { InternalApiSignerKind } from '@platform/internal-api';
import { internalHttpConfigSchema } from '../internal-http.config.js';
import { SignedInternalHttp } from '../signed-internal-http.js';

const SHARED = 'a'.repeat(40);

const configOf = (env: Record<string, string>) => {
  const loader = new ConfigLoader({
    INTERNAL_API_SHARED_SECRET: SHARED,
    ...env,
  });
  const registry = new ConfigRegistry();
  registry.setRoot(loader.load(internalHttpConfigSchema));
  return new RegistryAppConfig(loader, registry);
};

describe('SignedInternalHttp', () => {
  it('signs with the shared HMAC secret and routes each service to its base URL', () => {
    const settings = new SignedInternalHttp().settings(
      configOf({
        INTERNAL_API_BASE_URLS: JSON.stringify({
          identity: 'http://identity.internal',
        }),
      }),
      { clock: new SystemClock() },
    );

    expect(settings).toEqual({
      baseUrls: { identity: 'http://identity.internal' },
      secret: SHARED,
    });
  });

  it('accepts the previous secret on incoming calls while a rotation reaches every service', () => {
    const previous = 'b'.repeat(40);

    const settings = new SignedInternalHttp().settings(
      configOf({ INTERNAL_API_SHARED_SECRET_PREVIOUS: previous }),
      { clock: new SystemClock() },
    );

    expect(settings).toEqual({
      baseUrls: {},
      secret: SHARED,
      previousSecret: previous,
    });
  });

  it('refuses to start without the base URL of a service it calls', () => {
    expect(() =>
      new SignedInternalHttp(['identity', 'billing']).settings(
        configOf({
          INTERNAL_API_BASE_URLS: JSON.stringify({
            identity: 'http://identity.internal',
          }),
        }),
        { clock: new SystemClock() },
      ),
    ).toThrow('INTERNAL_API_BASE_URLS does not have the URL of billing');
  });

  it('refuses SigV4 signing without AWS credentials', () => {
    const sigV4 = InternalApiSignerKind.SigV4;
    expect(() =>
      new SignedInternalHttp().settings(
        configOf({ INTERNAL_API_SIGNER: sigV4 }),
        { clock: new SystemClock() },
      ),
    ).toThrow(/SigV4|sigv4/);
  });

  it('rejects base URLs that are not a JSON map of URLs', () => {
    expect(
      internalHttpConfigSchema.safeParse({
        INTERNAL_API_SHARED_SECRET: SHARED,
        INTERNAL_API_BASE_URLS: '{"identity":"not a url"}',
      }).success,
    ).toBe(false);
  });
});
