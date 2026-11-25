/** What a valid invitation says before it is accepted. */
export interface InvitationPreview {
  readonly invitationId: string;
  readonly tenantId: string;
  /** Email invitado, normalizado. */
  readonly email: string;
  readonly groupIds: readonly string[];
}
