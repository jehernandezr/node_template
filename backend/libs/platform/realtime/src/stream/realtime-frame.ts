/**
 * Frame that the server delivers to a connected user. With `closesSession` the connection of that session
 * delivers it and closes, and with `RealtimeFrames.ALL_SESSIONS` all of the user's: this way a revocation arrives through
 * the same ordered path as the rest of the frames.
 */
export interface RealtimeFrame {
  readonly type: string;
  readonly data: unknown;
  readonly closesSession?: string;
}

/** Frame already stored in the user's stream, with the id that orders it and allows resuming after it. */
export interface StoredFrame extends RealtimeFrame {
  readonly id: string;
}

/** Reserved values of the frames. */
export class RealtimeFrames {
  /** `closesSession` that closes all of the user's connections. */
  static readonly ALL_SESSIONS = '*';
}
