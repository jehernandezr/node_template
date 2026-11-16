import type { ClientChannel } from './client-channel.enum.js';

/** Lo que el servidor sabe del cliente de una petición. */
export interface ClientInfo {
  /** IP del cliente según `trust proxy`. Vacía si el servidor no la conoce. */
  readonly ip: string;
  /** `User-Agent` recortado a `HttpLimits.MAX_USER_AGENT_LENGTH`. */
  readonly userAgent?: string;
  /** Valor del header `Origin`, si vino. */
  readonly origin?: string;
  readonly channel: ClientChannel;
}
