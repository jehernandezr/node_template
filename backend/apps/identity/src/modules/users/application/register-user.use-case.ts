import { Injectable } from '@nestjs/common';
import { Clock, Id, UseCase } from '@platform/kernel';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';
import { normalizeEmail } from '../../../shared/utils/email-normalization.js';
import { IdentityMailer } from '../../alerts/index.js';
import { AccessFacade } from '../../access/index.js';
import { InvitationsFacade } from '../../invitations/index.js';
import { PasswordsFacade } from '../../passwords/index.js';
import {
  EmailProofPurpose,
  EmailProofStore,
} from '../domain/email-proof-store.js';
import type { SignUpCommand } from '../domain/sign-up-command.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { InvitationPreview } from '../../invitations/index.js';
import { UserReader } from './user-reader.js';
import { UserRegistrar } from './user-registrar.js';

/**
 * Registro desde la ruta pública. Responde igual exista o no el email: si ya tiene cuenta, se envía un
 * correo "ya tienes cuenta" en lugar del de verificación. La política de contraseña se revisa antes de
 * mirar el email, para que su error tampoco revele nada. El cupo del plan del tenant que invita también se
 * revisa antes de crear la cuenta: si no alcanza, no queda un usuario sin membresía que bloquee el reintento.
 * Si otro miembro toma el último cupo entre esa revisión y la aceptación, la cuenta queda creada sin membresía;
 * el reintento con la misma invitación la acepta para esa cuenta en lugar de responder que el email ya existe.
 */
@Injectable()
export class RegisterUser implements UseCase<SignUpCommand, void> {
  constructor(
    private readonly registrar: UserRegistrar,
    private readonly reader: UserReader,
    private readonly passwords: PasswordsFacade,
    private readonly invitations: InvitationsFacade,
    private readonly access: AccessFacade,
    private readonly proofs: EmailProofStore,
    private readonly mailer: IdentityMailer,
    private readonly clock: Clock,
    private readonly settings: IdentitySettings,
  ) {}

  async execute(command: SignUpCommand): Promise<void> {
    const email = normalizeEmail(command.email);
    await this.passwords.assertAcceptable(command.password, email);
    const invitation =
      command.invitationToken === undefined
        ? undefined
        : await this.invitations.preview(command.invitationToken);
    const invited = invitation !== undefined && invitation.email === email;
    if (invited) {
      await this.invitations.assertRoomForNewUser(invitation);
    }
    const homeTenantId = invited
      ? invitation.tenantId
      : this.settings.values.IDENTITY_DEFAULT_TENANT_ID;
    const ref = await this.registrar.register(
      { ...command, email, homeTenantId },
      invited ? this.clock.now() : undefined,
    );
    if (ref === undefined && invited) {
      const pending = await this.accountLeftByInvitation(email, invitation);
      if (pending !== undefined && command.invitationToken !== undefined) {
        await this.invitations.acceptForNewUser(
          command.invitationToken,
          pending,
        );
        return;
      }
    }
    if (ref === undefined) {
      await this.mailer.send({
        template: IdentityEmailTemplate.EmailAlreadyRegistered,
        to: email,
        locale: command.locale,
        variables: {},
      });
      return;
    }
    if (invited && command.invitationToken !== undefined) {
      await this.invitations.acceptForNewUser(command.invitationToken, ref);
      return;
    }
    await this.access.addMember(homeTenantId, ref, []);
    const token = await this.proofs.issue(EmailProofPurpose.Verification, {
      ...ref,
      email,
    });
    await this.mailer.send({
      template: IdentityEmailTemplate.EmailVerification,
      to: email,
      locale: command.locale,
      variables: { token },
    });
  }

  /**
   * La cuenta que dejó un registro con esta invitación cuya aceptación falló: tiene el email invitado, su tenant de
   * origen es el que invita, se verificó después de emitirse la invitación (que sigue pendiente) y no es miembro de
   * ningún tenant. Una cuenta que ya era miembro, o que salió de un tenant antes de esta invitación, no lo cumple.
   */
  private async accountLeftByInvitation(
    email: string,
    invitation: InvitationPreview,
  ): Promise<UserRef | undefined> {
    const existing = await this.reader.findByEmail(email);
    const issuedAt = Id.from(invitation.invitationId).timestamp();
    if (
      existing?.homeTenantId !== invitation.tenantId ||
      existing.emailVerifiedAt === undefined ||
      existing.emailVerifiedAt < issuedAt
    ) {
      return undefined;
    }
    const ref = { userId: existing.id, homeTenantId: existing.homeTenantId };
    const tenants = await this.access.tenantsOf(ref);
    return tenants.length === 0 ? ref : undefined;
  }
}
