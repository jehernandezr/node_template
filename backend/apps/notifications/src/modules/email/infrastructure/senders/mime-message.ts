import type { OutgoingEmail } from '../../domain/outgoing-email.js';

/**
 * `multipart/alternative` MIME message with text and HTML in base64: this way no line starts with a dot or
 * exceeds 76 characters, and the protocol needs no escaping. Pure utility.
 */
export class MimeMessage {
  private static readonly LINE = 76;

  static build(
    email: OutgoingEmail,
    messageId: string,
    date: Date,
    boundary: string,
  ): string {
    return [
      `From: ${email.from}`,
      `To: ${email.to}`,
      `Subject: ${MimeMessage.encodedWord(email.subject)}`,
      `Message-ID: <${messageId}>`,
      `Date: ${date.toUTCString()}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      MimeMessage.part(boundary, 'text/plain', email.text),
      MimeMessage.part(boundary, 'text/html', email.html),
      `--${boundary}--`,
      '',
    ].join('\r\n');
  }

  private static part(boundary: string, type: string, body: string): string {
    return [
      `--${boundary}`,
      `Content-Type: ${type}; charset=UTF-8`,
      'Content-Transfer-Encoding: base64',
      '',
      MimeMessage.wrap(Buffer.from(body, 'utf8').toString('base64')),
    ].join('\r\n');
  }

  private static encodedWord(text: string): string {
    return `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`;
  }

  private static wrap(base64: string): string {
    const lines: string[] = [];
    for (let start = 0; start < base64.length; start += MimeMessage.LINE) {
      lines.push(base64.slice(start, start + MimeMessage.LINE));
    }
    return lines.join('\r\n');
  }
}
