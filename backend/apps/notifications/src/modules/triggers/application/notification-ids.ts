import { createHash } from 'node:crypto';

/**
 * Id of the notice an event generates for a recipient: a UUIDv7 with the message timestamp and the
 * rest taken from a hash of message and recipient. Redelivery of the same event yields the same id and the notice
 * is not repeated. Pure utility.
 */
export class NotificationIds {
  private static readonly TIMESTAMP_HEX = 12;

  /**
   * Derives the notification id from the event and the user, so a redelivered event creates the same notification.
   * @param messageId Id of the event.
   * @param userId Recipient.
   * @returns A deterministic UUID.
   */
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
