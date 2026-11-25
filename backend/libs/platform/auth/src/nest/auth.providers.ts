import type { Abstract, Provider, Type } from '@nestjs/common';
import { BloomFilter, InMemoryAsyncBloomFilter } from '@platform/bloom';
import { ConfigValidationError } from '@platform/config';
import { Clock, SystemClock } from '@platform/kernel';
import { AccessEvaluator } from '../access/access-evaluator.js';
import { AccessGrantSource } from '../access/access-grant-source.js';
import { AccessResolver } from '../access/access-resolver.js';
import { CachedAccessResolver } from '../access/cached-access-resolver.js';
import { ApiKeyAuthenticator } from '../api-keys/api-key-authenticator.js';
import { ApiKeyResolver } from '../api-keys/api-key-resolver.js';
import { CachedApiKeyAuthenticator } from '../api-keys/cached-api-key-authenticator.js';
import { RejectingApiKeyResolver } from '../api-keys/rejecting-api-key-resolver.js';
import { type AuthSettings, AuthConfig } from '../auth.config.js';
import { HttpJwksFetcher } from '../jwks/http-jwks-fetcher.js';
import { JwksFetcher } from '../jwks/jwks-fetcher.js';
import { JwksKeySource } from '../jwks/jwks-key-source.js';
import { RemoteJwksKeySource } from '../jwks/remote-jwks-key-source.js';
import { AuthRevocationFeed } from '../state/auth-revocation-feed.js';
import { AuthStateReader } from '../state/auth-state-reader.js';
import { CachedAuthStateReader } from '../state/cached-auth-state-reader.js';
import { RevokedSessionRegistry } from '../state/revoked-session-registry.js';
import { RevokedSessionsRebuildJob } from '../jobs/revoked-sessions-rebuild-job.js';
import { AccessTokenVerifier } from '../verifier/access-token-verifier.js';
import type {
  AuthModuleExtras,
  AuthModuleOptions,
} from './auth-module-options.js';
import { AuthModuleRules } from './auth-module-rules.js';
import { AuthStateLifecycle } from './auth-state.lifecycle.js';
import { AUTH_OPTIONS, AUTH_STATE_SOURCE } from './auth.tokens.js';

/**
 * Providers of `AuthModule`. All are built with `useFactory` because the library
 * core has no decorators; only `AuthStateLifecycle` is a Nest class.
 */
export class AuthProviders {
  /**
   * @throws ConfigValidationError if `source`, `feed` or `accessGrants` is missing: the
   *   `forRoot` type marks them optional because the Nest module builder requires it.
   */
  static build(extras: Partial<AuthModuleExtras>): Provider[] {
    const source = AuthProviders.required(extras.source, 'source');
    const feed = AuthProviders.required(extras.feed, 'feed');
    const accessGrants = AuthProviders.required(
      extras.accessGrants,
      'accessGrants',
    );
    return [
      { provide: Clock, useClass: SystemClock },
      { provide: AUTH_STATE_SOURCE, useExisting: source },
      { provide: AuthRevocationFeed, useExisting: feed },
      { provide: AccessGrantSource, useExisting: accessGrants },
      {
        provide: RejectingApiKeyResolver,
        useFactory: () => new RejectingApiKeyResolver(),
      },
      {
        provide: ApiKeyResolver,
        useExisting: extras.apiKeyResolver ?? RejectingApiKeyResolver,
      },
      {
        provide: RevokedSessionRegistry,
        useFactory: () =>
          new RevokedSessionRegistry(
            new InMemoryAsyncBloomFilter(
              BloomFilter.create({
                expectedItems: AuthModuleRules.REVOKED_SESSIONS_EXPECTED_ITEMS,
              }),
            ),
          ),
      },
      {
        provide: RevokedSessionsRebuildJob,
        useFactory: (
          source: AuthStateReader,
          registry: RevokedSessionRegistry,
        ) => new RevokedSessionsRebuildJob(source, registry),
        inject: [AUTH_STATE_SOURCE, RevokedSessionRegistry],
      },
      {
        provide: AuthStateReader,
        useFactory: (
          source: AuthStateReader,
          registry: RevokedSessionRegistry,
          clock: Clock,
          options: AuthModuleOptions,
        ) =>
          new CachedAuthStateReader(source, registry, clock, {
            ttlMs: options.cacheTtlMs ?? AuthModuleRules.DEFAULT_CACHE_TTL_MS,
            maxEntries:
              options.cacheMaxEntries ??
              AuthModuleRules.DEFAULT_CACHE_MAX_ENTRIES,
          }),
        inject: [
          AUTH_STATE_SOURCE,
          RevokedSessionRegistry,
          Clock,
          AUTH_OPTIONS,
        ],
      },
      {
        provide: AccessResolver,
        useFactory: (
          state: AuthStateReader,
          source: AccessGrantSource,
          clock: Clock,
          options: AuthModuleOptions,
        ) =>
          new CachedAccessResolver(state, source, clock, {
            ttlMs: options.cacheTtlMs ?? AuthModuleRules.DEFAULT_CACHE_TTL_MS,
            maxEntries:
              options.cacheMaxEntries ??
              AuthModuleRules.DEFAULT_CACHE_MAX_ENTRIES,
          }),
        inject: [AuthStateReader, AccessGrantSource, Clock, AUTH_OPTIONS],
      },
      {
        provide: ApiKeyAuthenticator,
        useFactory: (
          state: AuthStateReader,
          resolver: ApiKeyResolver,
          clock: Clock,
        ) => new CachedApiKeyAuthenticator(state, resolver, clock),
        inject: [AuthStateReader, ApiKeyResolver, Clock],
      },
      ...AuthProviders.jwks(extras.jwks),
      {
        provide: AccessTokenVerifier,
        useFactory: (
          keys: JwksKeySource,
          state: AuthStateReader,
          access: AccessResolver,
          clock: Clock,
          settings: AuthSettings,
        ) =>
          new AccessTokenVerifier(
            keys,
            state,
            access,
            clock,
            settings.AUTH_ISSUER,
          ),
        inject: [
          JwksKeySource,
          AuthStateReader,
          AccessResolver,
          Clock,
          AuthConfig.token,
        ],
      },
      { provide: AccessEvaluator, useFactory: () => new AccessEvaluator() },
      AuthStateLifecycle,
    ];
  }

  /** What other modules receive. */
  static exports(): Array<symbol | Type<unknown> | Abstract<unknown>> {
    return [
      AuthStateReader,
      AccessResolver,
      ApiKeyAuthenticator,
      AccessTokenVerifier,
      AccessEvaluator,
      JwksKeySource,
      AUTH_STATE_SOURCE,
    ];
  }

  private static required<T>(value: T | undefined, name: string): T {
    if (value === undefined) {
      throw new ConfigValidationError([
        {
          path: `AuthModule.${name}`,
          code: 'custom',
          message: 'es obligatorio',
        },
      ]);
    }
    return value;
  }

  /** Returns the service keys if it passed its own; otherwise, the ones downloaded from `AUTH_JWKS_URL`. */
  private static jwks(custom: AuthModuleExtras['jwks']): Provider[] {
    if (custom !== undefined) {
      return [{ provide: JwksKeySource, useExisting: custom }];
    }
    return [
      {
        provide: JwksFetcher,
        useFactory: (settings: AuthSettings) => {
          if (settings.AUTH_JWKS_URL === undefined) {
            throw new ConfigValidationError([
              {
                path: 'AUTH_JWKS_URL',
                code: 'custom',
                message:
                  'se necesita cuando el módulo no recibe su propia JwksKeySource',
              },
            ]);
          }
          return new HttpJwksFetcher(settings.AUTH_JWKS_URL);
        },
        inject: [AuthConfig.token],
      },
      {
        provide: JwksKeySource,
        useFactory: (fetcher: JwksFetcher, clock: Clock) =>
          new RemoteJwksKeySource(fetcher, clock),
        inject: [JwksFetcher, Clock],
      },
    ];
  }
}
