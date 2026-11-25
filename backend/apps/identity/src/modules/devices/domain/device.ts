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

  static register(state: Omit<DeviceState, 'version' | 'removedAt'>): Device {
    return new Device(state);
  }

  static rehydrate(state: DeviceState): Device {
    return new Device(state);
  }

  get id(): string {
    return this.state.id;
  }

  snapshot(): DeviceState {
    return this.state;
  }

  isActive(): boolean {
    return this.state.removedAt === undefined;
  }

  /** Current and trusted: it can recognize a sign-in. */
  isTrusted(now: Date): boolean {
    return (
      this.isActive() &&
      (this.state.trustedUntil === undefined ||
        this.state.trustedUntil.getTime() > now.getTime())
    );
  }

  seen(now: Date, ip: string): void {
    this.state = { ...this.state, lastSeenAt: now, lastIp: ip };
  }

  remove(now: Date): boolean {
    if (!this.isActive()) {
      return false;
    }
    this.state = { ...this.state, removedAt: now, verifier: false };
    return true;
  }

  /** Removes trust without deleting the record: it is no longer recognized and no longer approves. */
  untrust(now: Date): void {
    this.state = { ...this.state, trustedUntil: now, verifier: false };
  }

  setPushToken(token: string): void {
    this.state = { ...this.state, pushToken: token };
  }

  retireVerifier(): void {
    this.state = { ...this.state, verifier: false };
  }

  makeVerifier(): void {
    this.state = { ...this.state, verifier: true };
  }
}
