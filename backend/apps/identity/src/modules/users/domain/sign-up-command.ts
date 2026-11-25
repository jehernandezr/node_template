/** Registration from the public route, with the client that requests it. */
export interface SignUpCommand {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly locale: string;
  readonly invitationToken?: string;
}
