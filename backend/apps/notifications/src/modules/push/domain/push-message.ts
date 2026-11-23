/** Lo que muestra un push en el dispositivo. */
export interface PushMessage {
  readonly notificationId: string;
  readonly title: string;
  readonly body: string;
}
