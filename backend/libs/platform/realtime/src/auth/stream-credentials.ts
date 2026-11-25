/** What the request of a realtime connection carries to authenticate it. */
export interface StreamCredentials {
  /** `Authorization` header or, in Socket.IO, `Bearer <token>` built from the handshake's `auth.token`. */
  readonly authorization?: string;
  /** `Cookie` header as it arrives. */
  readonly cookie?: string;
}
