import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { LockoutKeys } from '../application/lockout-keys.js';
import { RotateLoginAttemptPartitionsJob } from '../application/rotate-login-attempt-partitions.job.js';
import { LoginAttemptRetention } from '../domain/login-attempt-retention.js';
import { TypeOrmLoginAttemptRetention } from '../infrastructure/persistence/typeorm-login-attempt-retention.js';
import { SignInWithPassword } from '../application/sign-in-with-password.use-case.js';
import { LockoutStore } from '../domain/lockout-store.js';
import { AttemptCounters } from '../domain/attempt-counters.js';
import { CaptchaVerifier } from '../domain/captcha-verifier.js';
import { LoginLockout } from '../application/login-lockout.js';
import { UnlockAccount } from '../application/unlock-account.use-case.js';
import { AcceptingCaptchaVerifier } from '../infrastructure/accepting-captcha-verifier.js';
import { RateLimiterAttemptCounters } from '../infrastructure/rate-limiter-attempt-counters.js';
import { LoginAttemptRepository } from '../domain/login-attempt.repository.js';
import { EphemeralLockoutStore } from '../infrastructure/ephemeral-lockout-store.js';
import { LoginAttemptEntity } from '../infrastructure/persistence/entities/login-attempt.entity.js';
import { TypeOrmLoginAttemptRepository } from '../infrastructure/persistence/typeorm-login-attempt.repository.js';
import { AuthenticationController } from './authentication.controller.js';

/**
 * Inicio de sesión con contraseña, bloqueo por intentos y desbloqueo de cuentas. Es global solo para
 * compartir el bloqueo con las API keys y con el "No fui yo" de los dispositivos.
 */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [LoginAttemptEntity],
      sharding: { key: ShardKey.User },
    }),
  ],
  controllers: [AuthenticationController],
  providers: [
    { provide: LockoutStore, useClass: EphemeralLockoutStore },
    { provide: AttemptCounters, useClass: RateLimiterAttemptCounters },
    { provide: CaptchaVerifier, useClass: AcceptingCaptchaVerifier },
    LoginLockout,
    UnlockAccount,
    {
      provide: LoginAttemptRepository,
      useClass: TypeOrmLoginAttemptRepository,
    },
    {
      provide: LoginAttemptRetention,
      useClass: TypeOrmLoginAttemptRetention,
    },
    RotateLoginAttemptPartitionsJob,
    LockoutKeys,
    SignInWithPassword,
  ],
  exports: [LoginLockout, LockoutKeys],
})
export class AuthenticationModule {}
