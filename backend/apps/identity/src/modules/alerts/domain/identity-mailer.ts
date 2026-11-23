import type { OutgoingEmail } from './outgoing-email.js';

/** Envía el correo transaccional de identity. El adaptador real delega en el servicio `notifications`. */
export abstract class IdentityMailer {
  abstract send(email: OutgoingEmail): Promise<void>;
}
