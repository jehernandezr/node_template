import { Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { LockoutKeys } from '../application/lockout-keys.js';
import { LoginAttemptHistory } from '../application/login-attempt-history.js';
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

import { AccessCoreModule } from '../../access/module.js';
import { AlertsModule } from '../../alerts/module.js';
import { DevicesCoreModule } from '../../devices/module.js';
import { MfaModule } from '../../mfa/module.js';
import { PasswordsCoreModule } from '../../passwords/module.js';
import { SessionsModule } from '../../sessions/module.js';
import { UsersCoreModule } from '../../users/module.js';

/**
 * Password sign-in, lockout by attempts and account unlock. It exports the lockout to the API keys and to the
 * "It was not me" of the devices, and the sign-in history to the account erasure.
 */
@Module({
  imports: [
    AccessCoreModule,
    AlertsModule,
    DevicesCoreModule,
    MfaModule,
    PasswordsCoreModule,
    SessionsModule,
    UsersCoreModule,
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
    LoginAttemptHistory,
  ],
  exports: [LoginLockout, LockoutKeys, LoginAttemptHistory],
})
export class AuthenticationModule {}
