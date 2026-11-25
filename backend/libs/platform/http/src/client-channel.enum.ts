/** Channel the client talks through: decides where the session token travels. */
export enum ClientChannel {
  /** Browser: the session token travels only in the cookie. */
  Web = 'web',
  /** Native app: the session token travels in the body. */
  Native = 'native',
}
