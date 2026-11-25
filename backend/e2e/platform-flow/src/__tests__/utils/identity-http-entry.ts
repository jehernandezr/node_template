import {
  IdentityTestApp,
  MemoryIdentityMailer,
  type IdentityEntry,
} from '@apps/identity/test-utils';
import { HttpTestClient } from '@platform/http/test-utils';
import type { PlatformNode } from './platform-node.js';

/** Identity visto desde fuera, como en sus propias pruebas: detrás de un proxy y con el correo en memoria. */
export class IdentityHttpEntry implements IdentityEntry {
  constructor(private readonly identity: PlatformNode) {}

  client(ip = IdentityTestApp.DEFAULT_IP): HttpTestClient {
    return new HttpTestClient(this.identity.baseUrl(), {
      'X-Forwarded-For': ip,
    });
  }

  nativeClient(ip = IdentityTestApp.DEFAULT_IP): HttpTestClient {
    return this.client(ip).withHeaders({ 'X-Session-Transport': 'bearer' });
  }

  mailer(): MemoryIdentityMailer {
    return this.identity.get(MemoryIdentityMailer);
  }
}
