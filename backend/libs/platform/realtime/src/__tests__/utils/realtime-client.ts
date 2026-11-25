import type { ReceivedFrame } from './received-frame.js';

/** What a transport test sees of a connected client, whether SSE or Socket.IO. */
export interface RealtimeClient {
  readonly frames: readonly ReceivedFrame[];
  /** The server rejected it on connect. */
  readonly rejected: boolean;
  /** The server closed the connection. */
  readonly closedByServer: boolean;
  lastEventId(): string | undefined;
  close(): void;
}

/** Opens a client against the test server with a token and, to resume, the last id seen. */
export type RealtimeClientOpener = (
  baseUrl: string,
  token: string,
  lastEventId?: string,
) => Promise<RealtimeClient>;
