import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { ChallengeVerifier } from '../application/challenge-verifier.js';
import { LocalMfaFacade } from '../application/local-mfa.facade.js';
import { ManageMfaFactors } from '../application/manage-mfa-factors.use-case.js';
import { MfaFacade } from '../application/mfa.facade.js';
import { MfaMethodCatalog } from '../application/mfa-method-catalog.js';
import { MfaRecoveryUseCase } from '../application/mfa-recovery.use-case.js';
import { RequestMfaChallenge } from '../application/request-mfa-challenge.use-case.js';
import { StartPendingMfa } from '../application/start-pending-mfa.use-case.js';
import { StepUp } from '../application/step-up.use-case.js';
import { VerifyMfa } from '../application/verify-mfa.use-case.js';
import { ChallengeStore } from '../domain/challenge-store.js';
import { MfaFactorRepository } from '../domain/mfa-factor-repository.js';
import { PendingAuthenticationStore } from '../domain/pending-authentication-store.js';
import { SecretBox } from '../domain/secret-box.js';
import { AesGcmSecretBox } from '../infrastructure/aes-gcm-secret-box.js';
import { EphemeralChallengeStore } from '../infrastructure/ephemeral-challenge-store.js';
import { EphemeralPendingAuthenticationStore } from '../infrastructure/ephemeral-pending-authentication-store.js';
import { MfaRecoveryEntity } from '../infrastructure/persistence/entities/mfa-recovery.entity.js';
import { RecoveryCodeEntity } from '../infrastructure/persistence/entities/recovery-code.entity.js';
import { TotpFactorEntity } from '../infrastructure/persistence/entities/totp-factor.entity.js';
import { TypeOrmMfaFactorRepository } from '../infrastructure/persistence/typeorm-mfa-factor.repository.js';
import { MfaController } from './mfa.controller.js';

/** Challenges, TOTP, recovery codes, step-up and recovery without a device. Global only for its facade. */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [TotpFactorEntity, RecoveryCodeEntity, MfaRecoveryEntity],
      sharding: { key: ShardKey.User },
    }),
  ],
  controllers: [MfaController],
  providers: [
    {
      provide: PendingAuthenticationStore,
      useClass: EphemeralPendingAuthenticationStore,
    },
    { provide: ChallengeStore, useClass: EphemeralChallengeStore },
    { provide: MfaFactorRepository, useClass: TypeOrmMfaFactorRepository },
    { provide: SecretBox, useClass: AesGcmSecretBox },
    MfaMethodCatalog,
    StartPendingMfa,
    RequestMfaChallenge,
    ChallengeVerifier,
    VerifyMfa,
    StepUp,
    ManageMfaFactors,
    MfaRecoveryUseCase,
    { provide: MfaFacade, useClass: LocalMfaFacade },
  ],
  exports: [MfaFacade],
})
export class MfaModule {}
