import type { EmailSender } from '../../domain/email-sender.js';

/** An email as the destination receives it, read from the provider's side. */
export interface ReceivedEmail {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

/** The adapter under test and how to read what its provider received. */
export interface EmailSenderSubject {
  readonly sender: EmailSender;
  received(): Promise<readonly ReceivedEmail[]>;
}

/** What every `EmailSender` fulfills: the destination receives the whole email, with accents, and a send id remains. */
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
