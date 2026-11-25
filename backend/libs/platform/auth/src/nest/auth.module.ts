import { Module, type DynamicModule } from '@nestjs/common';
import type {
  AuthModuleExtras,
  AuthModuleOptions,
} from './auth-module-options.js';
import {
  AuthModuleClass,
  type AuthModuleAsyncOptions,
} from './auth.module-definition.js';

/**
 * Token verification and authorization for a service: `AccessTokenVerifier`,
 * `AccessResolver`, `ApiKeyAuthenticator`, `AccessEvaluator` and the `AuthStateReader`
 * with the local caches. It is global and needs a `ConfigModule.forRoot()`. The revoked
 * sessions Bloom filter lives in the memory of each process, not in `BloomModule`, because
 * each replica rebuilds its own; that periodic rebuild is run by the `JobRunner`
 * of `@platform/scheduling` if the service imports it.
 */
@Module({})
export class AuthModule extends AuthModuleClass {
  static override forRoot(
    options: AuthModuleOptions & Partial<AuthModuleExtras>,
  ): DynamicModule {
    return super.forRoot(options);
  }

  static override forRootAsync(
    options: AuthModuleAsyncOptions & Partial<AuthModuleExtras>,
  ): DynamicModule {
    return super.forRootAsync(options);
  }
}
