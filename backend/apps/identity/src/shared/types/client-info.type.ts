import type { ClientChannel } from '@platform/http';

/** Quién llama: lo que identity guarda de la petición de un inicio de sesión. */
export interface ClientInfo {
  readonly ip: string;
  readonly userAgent?: string;
  readonly channel: ClientChannel;
}
