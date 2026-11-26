import type {
  TenantDirectoryAck,
  TenantDirectoryEntry,
  TenantDirectoryOperations,
} from '@contracts/platform';
import { OperationHandler, type HandlerResult } from '@platform/internal-api';
import { InProcessInternalApi } from '@platform/internal-api/test-utils';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { CallOutcome } from '@platform/primitives';
import { TenantMoveErrorCode } from '@platform/tenant-move';
import { FollowerDirectoryUnavailableError } from '../../../../shared/errors/follower-directory-unavailable.error.js';
import { TenantDirectoryFollowers } from '../../application/tenant-directory-followers.js';
import { InternalFollowerDirectories } from '../internal-follower-directories.js';

const ENTRY: TenantDirectoryEntry = {
  tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a05',
  region: 'eu',
  groups: ['shard_0', 'shard_1'],
  dedicated: false,
};

/** A service's directory: records what it receives, or rejects it if the test asks for it. */
class RecordingDirectory extends OperationHandler<
  TenantDirectoryOperations['tenantDirectoryPlace']
> {
  readonly received: TenantDirectoryEntry[] = [];
  refuses = false;

  override async handle(
    input: TenantDirectoryEntry,
  ): Promise<HandlerResult<TenantDirectoryAck>> {
    if (this.refuses) {
      return {
        outcome: CallOutcome.businessError(TenantMoveErrorCode.UnknownTarget),
      };
    }
    this.received.push(input);
    return { outcome: CallOutcome.success({ tenantId: input.tenantId }) };
  }
}

const setup = () => {
  const ids = new SequentialIdGenerator();
  const operations = TenantDirectoryFollowers.ALL.map(
    (follower) => follower.tenantDirectoryPlace,
  );
  const api = new InProcessInternalApi({
    clock: new FixedClock(),
    ids,
    operations: TenantDirectoryFollowers.ALL.flatMap((follower) => [
      follower.tenantDirectoryPlace,
      follower.tenantDirectoryRemove,
    ]),
  });
  const directories = operations.map((operation) => {
    const directory = new RecordingDirectory();
    api.router.register(operation, directory);
    return directory;
  });
  return {
    directories,
    followers: new InternalFollowerDirectories(api.client, ids),
  };
};

describe('InternalFollowerDirectories', () => {
  it('places the tenant in the directory of every service', async () => {
    const { directories, followers } = setup();

    await followers.place(ENTRY);

    expect(directories.map((directory) => directory.received)).toEqual(
      directories.map(() => [ENTRY]),
    );
  });

  it('stops at the first service that does not confirm the placement', async () => {
    const { directories, followers } = setup();
    const [first, second, third] = directories;
    if (second !== undefined) {
      second.refuses = true;
    }

    await expect(followers.place(ENTRY)).rejects.toBeInstanceOf(
      FollowerDirectoryUnavailableError,
    );
    expect(first?.received).toEqual([ENTRY]);
    expect(third?.received).toEqual([]);
  });
});
