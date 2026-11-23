import type { EmailSender } from '../../domain/email-sender.js';

/** Un correo tal como lo recibe el destino, leído del lado del proveedor. */
export interface ReceivedEmail {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

/** El adaptador bajo prueba y cómo leer lo que su proveedor recibió. */
export interface EmailSenderSubject {
  readonly sender: EmailSender;
  received(): Promise<readonly ReceivedEmail[]>;
}

/** Lo que todo `EmailSender` cumple: el destino recibe el correo entero, con acentos, y queda un id del envío. */
export function runEmailSenderContract(
  name: string,
  subject: () => EmailSenderSubject,
): void {
  describe(`${name} (EmailSender contract)`, () => {
    it('hands the provider the whole message and returns its id', async () => {
      const { sender, received } = subject();

      const id = await sender.send({
        from: 'no-reply@example.com',
        to: 'ana@example.com',
        subject: 'Código de verificación',
        text: 'Tu código es 482913.',
        html: '<p>Tu código es <strong>482913</strong>.</p>',
      });

      expect(id).not.toBe('');
      await expect(received()).resolves.toContainEqual({
        from: 'no-reply@example.com',
        to: 'ana@example.com',
        subject: 'Código de verificación',
        text: 'Tu código es 482913.',
        html: '<p>Tu código es <strong>482913</strong>.</p>',
      });
    });
  });
}
