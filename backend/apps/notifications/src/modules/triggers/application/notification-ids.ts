import { createHash } from 'node:crypto';

/**
 * Id del aviso que un evento genera para un destinatario: un UUIDv7 con la marca de tiempo del mensaje y el
 * resto sacado de un hash de mensaje y destinatario. La reentrega del mismo evento da el mismo id y el aviso
 * no se repite. Utilidad pura.
 */
export class NotificationIds {
  private static readonly TIMESTAMP_HEX = 12;

  static derive(messageId: string, userId: string): string {
    const timestamp = messageId
      .replace(/-/g, '')
      .slice(0, NotificationIds.TIMESTAMP_HEX);
    const random = createHash('sha256')
      .update(`${messageId}:${userId}`)
      .digest('hex');
    const variant = ((parseInt(random.charAt(3), 16) & 0x3) | 0x8).toString(16);
    const hex = `${timestamp.padStart(NotificationIds.TIMESTAMP_HEX, '0')}7${random.slice(0, 3)}${variant}${random.slice(4, 19)}`;
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }
}
