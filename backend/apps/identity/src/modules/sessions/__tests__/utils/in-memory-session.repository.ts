import type { TransactionManager } from '@platform/kernel';
import { SessionRepository } from '../../domain/session.repository.js';
import { Session } from '../../domain/session.js';

/**
 * Sessions kept in memory as snapshots. `findForUpdate` takes the row as `FOR UPDATE` does: a second transaction
 * that asks for the same session waits until the first one commits or rolls back, and then reads what it saved.
 */
export class InMemorySessionRepository extends SessionRepository {
  private readonly stored = new Map<string, Session>();
  private readonly locks = new Map<string, Promise<void>>();

  constructor(private readonly transactions: TransactionManager) {
    super();
  }

  override async insert(session: Session): Promise<void> {
    this.save(session);
  }

  override async find(
    userId: string,
    sessionId: string,
  ): Promise<Session | undefined> {
    return this.read(userId, sessionId);
  }

  override async findForUpdate(
    userId: string,
    sessionId: string,
  ): Promise<Session | undefined> {
    const unitOfWork = this.transactions.current();
    if (unitOfWork === undefined) {
      throw new Error('findForUpdate runs inside a transaction');
    }
    const key = `${userId}:${sessionId}`;
    const previous = this.locks.get(key) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(
      key,
      previous.then(() => held),
    );
    unitOfWork.afterCommit(release);
    unitOfWork.afterRollback(release);
    await previous;
    return this.read(userId, sessionId);
  }

  override async listActive(userId: string): Promise<readonly Session[]> {
    return [...this.stored.values()]
      .filter((session) => session.snapshot().userId === userId)
      .filter((session) => !session.isRevoked())
      .map((session) => Session.rehydrate(session.snapshot()));
  }

  override async update(session: Session): Promise<void> {
    this.save(session);
  }

  override async forget(userId: string): Promise<void> {
    for (const [key, session] of this.stored) {
      if (session.snapshot().userId === userId) {
        this.stored.delete(key);
      }
    }
  }

  private read(userId: string, sessionId: string): Session | undefined {
    const session = this.stored.get(`${userId}:${sessionId}`);
    return session === undefined
      ? undefined
      : Session.rehydrate(session.snapshot());
  }

  private save(session: Session): void {
    const state = session.snapshot();
    this.stored.set(`${state.userId}:${state.id}`, Session.rehydrate(state));
  }
}
