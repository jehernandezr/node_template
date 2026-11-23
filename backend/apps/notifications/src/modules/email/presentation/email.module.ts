import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { EmailFacade } from '../application/email.facade.js';
import { SendEmail } from '../application/send-email.use-case.js';
import { EmailLedger } from '../domain/email-ledger.js';
import { RecipientFingerprint } from '../domain/recipient-fingerprint.js';
import { EmailTemplates } from '../domain/templates/email-templates.js';
import { HmacRecipientFingerprint } from '../infrastructure/hmac-recipient-fingerprint.js';
import { EmailMessageEntity } from '../infrastructure/persistence/entities/email-message.entity.js';
import { EmailSuppressionEntity } from '../infrastructure/persistence/entities/email-suppression.entity.js';
import { TypeOrmEmailLedger } from '../infrastructure/persistence/typeorm-email-ledger.js';
import { EmailInternalOperations } from './email.internal-operations.js';
import { EmailSenderLifecycle } from './email-sender.lifecycle.js';
import { EmailSenderProvider } from './email-sender.provider.js';

/** Correo transaccional y de notificaciones con el proveedor de `NOTIFICATIONS_EMAIL_SENDER`. */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      catalog: true,
      entities: [EmailMessageEntity, EmailSuppressionEntity],
    }),
  ],
  providers: [
    EmailSenderProvider,
    EmailSenderLifecycle,
    { provide: EmailLedger, useClass: TypeOrmEmailLedger },
    { provide: RecipientFingerprint, useClass: HmacRecipientFingerprint },
    { provide: EmailTemplates, useValue: new EmailTemplates() },
    SendEmail,
    { provide: EmailFacade, useExisting: SendEmail },
    EmailInternalOperations,
  ],
  exports: [EmailFacade],
})
export class EmailModule {}
