import { InvitationStatus } from '@contracts/identity';

/** Full state of an invitation, as stored. */
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

/** An invitation to a tenant: valid for seven days and a single use. */
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

  /** The state at time `now`: an expired pending one counts as expired even if no one has marked it. */
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

  /** Returns `false` if it was no longer pending. */
  revoke(now: Date): boolean {
    if (!this.isUsable(now)) {
      return false;
    }
    this.state = { ...this.state, status: InvitationStatus.Revoked };
    return true;
  }
}
