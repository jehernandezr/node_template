import { InvitationStatus } from '@contracts/identity';

/** Estado completo de una invitación, tal como se guarda. */
export interface InvitationState {
  readonly id: string;
  readonly tenantId: string;
  /** Email invitado, normalizado. */
  readonly email: string;
  readonly groupIds: readonly string[];
  readonly invitedBy: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly status: InvitationStatus;
  readonly version?: number;
}

/** Una invitación a un tenant: vale siete días y un solo uso. */
export class Invitation {
  private constructor(private state: InvitationState) {}

  static issue(state: Omit<InvitationState, 'status' | 'version'>): Invitation {
    return new Invitation({ ...state, status: InvitationStatus.Pending });
  }

  static rehydrate(state: InvitationState): Invitation {
    return new Invitation(state);
  }

  snapshot(): InvitationState {
    return this.state;
  }

  /** El estado a la hora `now`: una pendiente vencida cuenta como vencida aunque nadie la haya marcado. */
  statusAt(now: Date): InvitationStatus {
    return this.state.status === InvitationStatus.Pending &&
      now.getTime() >= this.state.expiresAt.getTime()
      ? InvitationStatus.Expired
      : this.state.status;
  }

  isUsable(now: Date): boolean {
    return this.statusAt(now) === InvitationStatus.Pending;
  }

  accept(): void {
    this.state = { ...this.state, status: InvitationStatus.Accepted };
  }

  /** Devuelve `false` si ya no estaba pendiente. */
  revoke(now: Date): boolean {
    if (!this.isUsable(now)) {
      return false;
    }
    this.state = { ...this.state, status: InvitationStatus.Revoked };
    return true;
  }
}
