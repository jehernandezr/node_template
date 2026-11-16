import type { Page } from '@contracts/platform';
import type { InvitationStatus } from '../enums/tenant.enum.js';

/** Invitación pendiente, aceptada, revocada o vencida. */
export interface InvitationSummary {
  id: string;
  email: string;
  groupIds: string[];
  status: InvitationStatus;
  /** Instante ISO 8601 en que vence la invitación. */
  expiresAt: string;
  invitedBy: string;
}

export type InvitationPage = Page<InvitationSummary>;

/** Invitación de un email a los grupos indicados. */
export interface InviteUserRequest {
  email: string;
  groupIds: string[];
}

/** Revocación de una invitación pendiente. */
export interface RevokeInvitationRequest {
  invitationId: string;
}

/** Aceptación de la invitación con el token enviado por email. */
export interface AcceptInvitationRequest {
  token: string;
}
