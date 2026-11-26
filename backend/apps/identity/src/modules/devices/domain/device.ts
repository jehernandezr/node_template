import type { ClientPlatform } from '@contracts/identity';

/** Full state of a device, as it is stored. */
export interface DeviceState {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly platform: ClientPlatform;
  /** P-256 public key in SPKI DER, base64url. */
  readonly publicKey: string;
  readonly firstSeenAt: Date;
  readonly lastSeenAt: Date;
  readonly lastIp: string;
  readonly trustedUntil?: Date;
  readonly verifier: boolean;
  readonly pushToken?: string;
  readonly removedAt?: Date;
  readonly version?: number;
}

/** A user's device with its key. The verifier approves the sign-ins of the others. */
export class Device {
  private constructor(private state: DeviceState) {}

  /**
   * Registers a new device in version 1.
   * @param state Device data.
   * @returns The device.
   */
  static register(state: Omit<DeviceState, 'version' | 'removedAt'>): Device {
    return new Device(state);
  }

  /**
   * Rebuilds a device from its state.
   * @param state Stored device.
   * @returns The device.
   */
  static rehydrate(state: DeviceState): Device {
    return new Device(state);
  }

  /** Id of the device. */
  get id(): string {
    return this.state.id;
  }

  /**
   * Copies the device state.
   * @returns The device state.
   */
  snapshot(): DeviceState {
    return this.state;
  }

  /**
   * Tells whether the device was not removed.
   * @returns `true` when active.
   */
  isActive(): boolean {
    return this.state.removedAt === undefined;
  }

  /**
   * Tells whether the device is current and trusted, so it can recognize a sign-in.
   * @param now Instant to check.
   * @returns `true` when trusted.
   */
  isTrusted(now: Date): boolean {
    return (
      this.isActive() &&
      (this.state.trustedUntil === undefined ||
        this.state.trustedUntil.getTime() > now.getTime())
    );
  }

  /**
   * Records that the device was used to sign in.
   * @param now Instant of the use.
   * @param ip IP it came from.
   */
  seen(now: Date, ip: string): void {
    this.state = { ...this.state, lastSeenAt: now, lastIp: ip };
  }

  /**
   * Removes the device.
   * @param now Instant of the removal.
   * @returns Whether it was active.
   */
  remove(now: Date): boolean {
    if (!this.isActive()) {
      return false;
    }
    this.state = { ...this.state, removedAt: now, verifier: false };
    return true;
  }

  /**
   * Removes trust without deleting the record: it is no longer recognized and no longer approves.
   * @param now Instant of the change.
   */
  untrust(now: Date): void {
    this.state = { ...this.state, trustedUntil: now, verifier: false };
  }

  /**
   * Stores the push token of the device.
   * @param token Token of the push provider.
   */
  setPushToken(token: string): void {
    this.state = { ...this.state, pushToken: token };
  }

  /** Stops the device from approving sign-ins of other devices. */
  retireVerifier(): void {
    this.state = { ...this.state, verifier: false };
  }

  /** Lets the device approve sign-ins of other devices. */
  makeVerifier(): void {
    this.state = { ...this.state, verifier: true };
  }
}
