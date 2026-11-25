import type { HttpTestClient } from '@platform/http/test-utils';
import type { MemoryIdentityMailer } from '../../modules/alerts/index.js';

/** What a test user needs from a running identity: HTTP clients per IP and the sent email. */
export interface IdentityEntry {
  /** Client without channel headers: the request counts as web. `ip` is the one the proxy declares. */
  client(ip?: string): HttpTestClient;
  /** Native app client: the session token travels in the body. */
  nativeClient(ip?: string): HttpTestClient;
  mailer(): MemoryIdentityMailer;
}
