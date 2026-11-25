import type { ClientChannel } from '@platform/http';

/** Who is calling: what identity stores from a sign-in request. */
export interface ClientInfo {
  readonly ip: string;
  readonly userAgent?: string;
  readonly channel: ClientChannel;
}
