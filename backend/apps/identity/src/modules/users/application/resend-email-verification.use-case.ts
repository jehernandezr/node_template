import { Injectable } from '@nestjs/common';
import { UserStatus } from '@contracts/identity';
import { UseCase } from '@platform/kernel';
import { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';
import { IdentityMailer } from '../../alerts/index.js';
import {
  EmailProofPurpose,
  EmailProofStore,
} from '../domain/email-proof-store.js';
import { UserReader } from './user-reader.js';

/** Sends another verification email. Responds the same whether or not the account exists. */
@Injectable()
export class ResendEmailVerification implements UseCase<string, void> {
  constructor(
    private readonly reader: UserReader,
    private readonly proofs: EmailProofStore,
    private readonly mailer: IdentityMailer,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.reader.findByEmail(email);
    if (user === undefined || user.status !== UserStatus.PendingVerification) {
      return;
    }
    const token = await this.proofs.issue(EmailProofPurpose.Verification, {
      userId: user.id,
      homeTenantId: user.homeTenantId,
      email: user.email,
    });
    await this.mailer.send({
      template: IdentityEmailTemplate.EmailVerification,
      to: user.email,
      locale: user.locale,
      variables: { token },
    });
  }
}
