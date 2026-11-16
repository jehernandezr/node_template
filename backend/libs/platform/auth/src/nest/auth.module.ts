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
 * Verificación de tokens y autorización para un servicio: `AccessTokenVerifier`,
 * `AccessResolver`, `ApiKeyAuthenticator`, `AccessEvaluator` y el `AuthStateReader`
 * con las cachés locales. Es global y necesita un `ConfigModule.forRoot()`. El Bloom de
 * sesiones revocadas vive en la memoria de cada proceso, no en `BloomModule`, porque
 * cada réplica reconstruye el suyo; esa reconstrucción periódica la corre el `JobRunner`
 * de `@platform/scheduling` si el servicio lo importa.
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
