/** Lo que una invitación vigente dice antes de aceptarla. */
export interface InvitationPreview {
  readonly invitationId: string;
  readonly tenantId: string;
  /** Email invitado, normalizado. */
  readonly email: string;
  readonly groupIds: readonly string[];
}
