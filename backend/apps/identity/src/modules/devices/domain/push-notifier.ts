/** Wakes up a device's app so it requests its approvals. */
export abstract class PushNotifier {
  /**
   * Wakes a device so it pulls its pending approvals.
   * @param deviceId Device to wake.
   * @param pushToken Token of the push provider.
   */
  abstract wake(deviceId: string, pushToken: string): Promise<void>;
}
