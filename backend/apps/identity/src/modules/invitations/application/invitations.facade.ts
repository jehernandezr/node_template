import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { InvitationPreview } from '../domain/invitation-preview.js';

/** Lo que `invitations` ofrece a los otros módulos. */
export abstract class InvitationsFacade {
  /** La invitación vigente del token, o `undefined` si no existe, venció o ya se usó. */
  abstract preview(token: string): Promise<InvitationPreview | undefined>;

  /**
   * Acepta la invitación para un usuario recién registrado con el mismo email: agrega la membresía y marca
   * la invitación. El token llegó a ese email, así que prueba que el usuario lo controla.
   */
  abstract acceptForNewUser(token: string, user: UserRef): Promise<void>;

  /**
   * Comprueba que el plan del tenant de la invitación admita un usuario más, antes de crear la cuenta que la
   * va a aceptar.
   * @throws QuotaExceededError `BILLING.QUOTA.EXCEEDED` si el plan ya no admite otro usuario.
   * @throws BillingUnavailableError si billing no responde.
   */
  abstract assertRoomForNewUser(invitation: InvitationPreview): Promise<void>;
}
