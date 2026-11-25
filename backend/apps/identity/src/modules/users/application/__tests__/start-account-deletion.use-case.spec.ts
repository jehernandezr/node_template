import { SagaStatus } from '@platform/saga';
import { SagaEngineKit } from '@platform/saga/test-utils';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import {
  RecordingParticipants,
  TestShardScopes,
} from '../../../../__tests__/utils/index.js';
import { InMemoryAccessFacade } from '../../../access/__tests__/utils/index.js';
import { IdentitySagas } from '../../../sagas/index.js';
import { InMemorySagaDirectory } from '../../../sagas/__tests__/utils/index.js';
import { DeleteAccountSaga } from '../delete-account.saga.js';
import { StartAccountDeletion } from '../start-account-deletion.use-case.js';

const HOME = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
const ACME = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a02';
const USER = {
  userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01',
  homeTenantId: HOME,
};

/** Saga catalog that can stop answering, so the saga never starts. */
class UnreachableSagaDirectory extends InMemorySagaDirectory {
  reachable = true;

  /**
   * Records the saga while the catalog answers.
   * @param entry Saga to record.
   * @throws Error if the catalog is unreachable.
   */
  override async record(
    entry: Parameters<InMemorySagaDirectory['record']>[0],
  ): Promise<void> {
    if (!this.reachable) {
      throw new Error('saga catalog unreachable');
    }
    await super.record(entry);
  }
}

/** A user who belongs to two tenants, and the use case that starts the deletion of their account. */
class AccountDeletionFixture {
  readonly access = new InMemoryAccessFacade()
    .addMembership(USER.userId, HOME)
    .addMembership(USER.userId, ACME);
  readonly directory = new UnreachableSagaDirectory();
  readonly kit = new SagaEngineKit({
    invoker: new RecordingParticipants(),
    definitions: [new DeleteAccountSaga()],
  });
  readonly start = new StartAccountDeletion(
    new IdentitySagas(
      this.kit.sagas,
      this.kit.store,
      this.directory,
      TestShardScopes.create(),
    ),
    this.access,
    new SequentialIdGenerator(),
  );

  /**
   * Lists the tenants the user is leaving.
   * @returns Tenants whose departure is reserved, in a fixed order.
   */
  leavingTenants(): readonly string[] {
    return [HOME, ACME].filter((tenantId) =>
      this.access.isLeaving(USER.userId, tenantId),
    );
  }
}

describe('StartAccountDeletion', () => {
  it('reserves the departure from every tenant and runs the deletion saga', async () => {
    const fixture = new AccountDeletionFixture();

    const { sagaId } = await fixture.start.execute(USER);

    expect(fixture.leavingTenants()).toEqual([HOME, ACME]);
    expect(await fixture.kit.store.get(sagaId)).toMatchObject({
      status: SagaStatus.Completed,
    });
  });

  it('gives back the departures it reserved when the saga does not start', async () => {
    const fixture = new AccountDeletionFixture();
    fixture.directory.reachable = false;

    await expect(fixture.start.execute(USER)).rejects.toThrow(
      'saga catalog unreachable',
    );

    expect(fixture.leavingTenants()).toEqual([]);
  });

  it('keeps the departures of an earlier deletion in flight when a repeated request does not start', async () => {
    const fixture = new AccountDeletionFixture();
    await fixture.access.reserveDepartures({
      userId: USER.userId,
      homeTenantId: HOME,
    });
    fixture.directory.reachable = false;

    await expect(fixture.start.execute(USER)).rejects.toThrow(
      'saga catalog unreachable',
    );

    expect(fixture.leavingTenants()).toEqual([HOME, ACME]);
  });
});
