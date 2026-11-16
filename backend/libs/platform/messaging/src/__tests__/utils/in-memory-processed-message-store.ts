import {
  ClaimState,
  type ClaimRequest,
  type ClaimResult,
  type Clock,
  type IdGenerator,
  SystemClock,
  UuidV7IdGenerator,
} from '@platform/kernel';
import {
  ClaimRules,
  DeadlineExceededError,
  StaleClaimError,
} from '@platform/primitives';
import {
  ProcessedMessageStore,
  type ProcessedMessage,
} from '../../dispatch/processed-message-store.js';

type StoredClaim =
  | {
      readonly state: ClaimState.InProgress;
      readonly fingerprint: string;
      readonly claimToken: string;
      readonly leaseUntil: number;
    }
  | {
      readonly state: ClaimState.Completed;
      readonly fingerprint: string;
      readonly result: ProcessedMessage;
    };

/**
 * Doble en memoria de `ProcessedMessageStore`. Es atómico dentro de un proceso
 * porque cada método resuelve sin ceder el hilo. Sirve para pruebas y para un
 * servicio de un solo proceso.
 */
export class InMemoryProcessedMessageStore extends ProcessedMessageStore {
  private readonly records = new Map<string, StoredClaim>();

  constructor(
    private readonly clock: Clock = new SystemClock(),
    private readonly ids: IdGenerator = new UuidV7IdGenerator(clock),
  ) {
    super();
  }

  claim(
    key: string,
    request: ClaimRequest,
  ): Promise<ClaimResult<ProcessedMessage>> {
    try {
      return Promise.resolve(this.claimNow(key, request));
    } catch (error) {
      return Promise.reject(error as Error);
    }
  }

  complete(
    key: string,
    claimToken: string,
    result: ProcessedMessage,
  ): Promise<void> {
    const record = this.ownedRecord(key, claimToken);
    if (record === undefined) {
      return Promise.reject(new StaleClaimError('complete'));
    }
    this.records.set(key, {
      state: ClaimState.Completed,
      fingerprint: record.fingerprint,
      result,
    });
    return Promise.resolve();
  }

  release(key: string, claimToken: string): Promise<void> {
    if (this.ownedRecord(key, claimToken) === undefined) {
      return Promise.reject(new StaleClaimError('release'));
    }
    this.records.delete(key);
    return Promise.resolve();
  }

  purgeCompleted(before: Date): Promise<number> {
    let deleted = 0;
    for (const [key, record] of this.records) {
      if (
        record.state === ClaimState.Completed &&
        record.result.processedAt < before.getTime()
      ) {
        this.records.delete(key);
        deleted++;
      }
    }
    return Promise.resolve(deleted);
  }

  private claimNow(
    key: string,
    request: ClaimRequest,
  ): ClaimResult<ProcessedMessage> {
    ClaimRules.assertInput(key, request.fingerprint);
    const now = this.clock.now().getTime();
    const record = this.records.get(key);

    if (record?.state === ClaimState.Completed) {
      return {
        state: ClaimState.Completed,
        result: record.result,
        fingerprint: record.fingerprint,
      };
    }
    if (record !== undefined && record.leaseUntil > now) {
      return {
        state: ClaimState.InProgress,
        leaseUntil: record.leaseUntil,
        fingerprint: record.fingerprint,
      };
    }
    if (request.deadline.atMs <= now) {
      throw new DeadlineExceededError(request.deadline.atMs);
    }

    // Llave libre o lease vencido: token nuevo e invalida el anterior. Al tomar
    // un lease vencido se conserva la huella del primer claim.
    const fingerprint = record?.fingerprint ?? request.fingerprint;
    const claimToken = this.ids.next().toString();
    const leaseUntil = ClaimRules.computeLeaseUntil(request, now);
    this.records.set(key, {
      state: ClaimState.InProgress,
      fingerprint,
      claimToken,
      leaseUntil,
    });
    return {
      state: ClaimState.Acquired,
      claimToken,
      leaseUntil,
      fingerprint,
      takeover: record !== undefined,
    };
  }

  /** Registro en curso cuyo token vigente es `claimToken`, aunque su lease haya vencido. */
  private ownedRecord(
    key: string,
    claimToken: string,
  ): Extract<StoredClaim, { state: ClaimState.InProgress }> | undefined {
    const record = this.records.get(key);
    return record?.state === ClaimState.InProgress &&
      record.claimToken === claimToken
      ? record
      : undefined;
  }
}
