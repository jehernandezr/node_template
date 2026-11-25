import type { ClientChannel } from './client-channel.enum.js';

/** What the server knows about the client of a request. */
export interface ClientInfo {
  /** Client IP according to `trust proxy`. Empty if the server does not know it. */
  readonly ip: string;
  /** `User-Agent` recortado a `HttpLimits.MAX_USER_AGENT_LENGTH`. */
  readonly userAgent?: string;
  /** Value of the `Origin` header, if present. */
  readonly origin?: string;
  readonly channel: ClientChannel;
}
