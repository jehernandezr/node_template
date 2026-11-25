/** Wakes up a device's app so it requests its approvals. */
export abstract class PushNotifier {
  abstract wake(deviceId: string, pushToken: string): Promise<void>;
}
