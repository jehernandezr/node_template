import type { ClientPlatform } from '@contracts/identity';

/** Estado completo de un dispositivo, tal como se guarda. */
export interface DeviceState {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly platform: ClientPlatform;
  /** Clave pública P-256 en SPKI DER, base64url. */
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

/** Un dispositivo del usuario con su clave. El verificador aprueba los inicios de sesión de los demás. */
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

  /** Vigente y con confianza: puede reconocer un inicio de sesión. */
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

  /** Quita la confianza sin borrar el registro: deja de reconocerse y de aprobar. */
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
