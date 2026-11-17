/** Despierta la app de un dispositivo para que pida sus aprobaciones. */
export abstract class PushNotifier {
  abstract wake(deviceId: string, pushToken: string): Promise<void>;
}
