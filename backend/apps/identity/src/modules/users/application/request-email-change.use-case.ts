import { Injectable } from '@nestjs/common';
import { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';
import { normalizeEmail } from '../../../shared/utils/email-normalization.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { IdentityMailer } from '../../alerts/index.js';
import {
  EmailProofPurpose,
  EmailProofStore,
} from '../domain/email-proof-store.js';
import { UserReader } from './user-reader.js';

/**
 * Envía a la dirección nueva un token para confirmar el cambio. Si la dirección ya es de otra cuenta,
 * no se envía nada y se responde igual, para no revelarla.
 */
@Injectable()
export class RequestEmailChange {
  constructor(
    private readonly reader: UserReader,
    private readonly proofs: EmailProofStore,
    private readonly mailer: IdentityMailer,
  ) {}

  async execute(ref: UserRef, newEmail: string): Promise<void> {
    const email = normalizeEmail(newEmail);
    if ((await this.reader.findByEmail(email)) !== undefined) {
      return;
    }
    const token = await this.proofs.issue(EmailProofPurpose.Change, {
      ...ref,
      email,
    });
    const { locale } = await this.reader.getByRef(ref);
    await this.mailer.send({
      template: IdentityEmailTemplate.EmailChangeConfirmation,
      to: email,
      locale,
      variables: { token },
    });
  }
}
