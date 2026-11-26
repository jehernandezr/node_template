import { PasswordReset } from '../../domain/password-reset.js';
import { PasswordResetRepository } from '../../domain/password-reset.repository.js';

/** In-memory recoveries, indexed by id. */
export class InMemoryPasswordResetRepository extends PasswordResetRepository {
  readonly rows = new Map<string, PasswordReset>();

  override async insert(reset: PasswordReset): Promise<void> {
    this.rows.set(reset.id, PasswordReset.rehydrate(reset.snapshot()));
  }

  override async findForUpdate(
    userId: string,
    resetId: string,
  ): Promise<PasswordReset | undefined> {
    const row = this.rows.get(resetId);
    return row === undefined || row.snapshot().userId !== userId
      ? undefined
      : PasswordReset.rehydrate(row.snapshot());
  }

  override async update(reset: PasswordReset): Promise<void> {
    this.rows.set(reset.id, PasswordReset.rehydrate(reset.snapshot()));
  }
}
