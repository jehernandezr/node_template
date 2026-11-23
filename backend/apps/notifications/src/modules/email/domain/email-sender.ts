import type { OutgoingEmail } from './outgoing-email.js';

/** Proveedor que entrega los correos. */
export abstract class EmailSender {
  /** Devuelve el id que el proveedor asigna al correo. */
  abstract send(email: OutgoingEmail): Promise<string>;

  /** Libera las conexiones del proveedor al apagar; los que no guardan ninguna no hacen nada. */
  close(): void {
    return;
  }
}
