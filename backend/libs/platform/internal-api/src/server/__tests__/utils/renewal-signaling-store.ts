import { RecordingProcessedOperationStore } from './recording-processed-operation-store.js';

/** Almacén en memoria que avisa cada vez que alguien renueva un lease, para esperar la renovación sin dormir. */
export class RenewalSignalingStore extends RecordingProcessedOperationStore {
  renewals = 0;
  private waiting: Array<() => void> = [];

  /** Renueva en memoria y despierta a quien espera la próxima renovación. */
  override async renew(
    key: string,
    claimToken: string,
    leaseUntilMs: number,
  ): Promise<boolean> {
    const renewed = await super.renew(key, claimToken, leaseUntilMs);
    this.renewals += 1;
    const waiting = this.waiting;
    this.waiting = [];
    for (const wake of waiting) {
      wake();
    }
    return renewed;
  }

  /** Se resuelve con la próxima renovación. */
  nextRenewal(): Promise<void> {
    return new Promise((resolve) => {
      this.waiting.push(resolve);
    });
  }
}
