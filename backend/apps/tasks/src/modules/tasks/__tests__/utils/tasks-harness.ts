import type { UserRef } from '@contracts/platform';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import {
  InMemoryTransactionManager,
  RecordingMessageBus,
} from '@platform/messaging/test-utils';
import {
  Redactor,
  RequestContextStore,
  Tracing,
} from '@platform/observability';
import { ShardScope } from '@platform/persistence';
import { ShardRouter } from '@platform/sharding';
import { InMemoryDirectoryStore } from '@platform/sharding/test-utils';
import { TenantShard } from '../../../../shared/utils/tenant-shard.js';
import { CreateTask } from '../../application/create-task.use-case.js';
import { DeleteTask } from '../../application/delete-task.use-case.js';
import { GetTask } from '../../application/get-task.query.js';
import { ListTaskChanges } from '../../application/list-task-changes.query.js';
import { ListTasks } from '../../application/list-tasks.query.js';
import { UpdateTask } from '../../application/update-task.use-case.js';
import { InMemoryTaskRepository } from './in-memory-task.repository.js';
import { InMemoryTaskSearch } from './in-memory-task-search.js';

/** The task use cases built over in-memory fakes, with a deterministic clock and ids. */
export class TasksHarness {
  static readonly TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
  static readonly OTHER_TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a02';
  static readonly ANA: UserRef = {
    userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01',
    homeTenantId: TasksHarness.TENANT,
  };
  static readonly BEA: UserRef = {
    userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b02',
    homeTenantId: TasksHarness.TENANT,
  };

  readonly clock = new FixedClock(new Date('2026-11-20T10:00:00.000Z'));
  readonly transactions = new InMemoryTransactionManager();
  readonly bus = new RecordingMessageBus(this.transactions);
  private readonly scope = new ShardScope(
    new ShardRouter({ directory: new InMemoryDirectoryStore() }),
  );
  private readonly shard = new TenantShard(
    this.scope,
    new RequestContextStore(new Tracing(new Redactor())),
  );
  readonly tasks = new InMemoryTaskRepository(this.scope);
  readonly search = new InMemoryTaskSearch(this.tasks);
  private readonly ids = new SequentialIdGenerator();

  readonly create = new CreateTask(
    this.tasks,
    this.search,
    this.bus,
    this.shard,
    this.transactions,
    this.ids,
    this.clock,
  );
  readonly update = new UpdateTask(
    this.tasks,
    this.search,
    this.bus,
    this.shard,
    this.transactions,
    this.clock,
  );
  readonly remove = new DeleteTask(
    this.tasks,
    this.search,
    this.bus,
    this.shard,
    this.transactions,
    this.clock,
  );
  readonly get = new GetTask(this.tasks, this.shard);
  readonly list = new ListTasks(this.tasks, this.search, this.shard);
  readonly changes = new ListTaskChanges(this.tasks, this.shard);

  /** Creates a task by Ana in the main tenant. */
  aTask(title = 'Prepare the meeting', description = 'With the client') {
    return this.create.execute({
      tenantId: TasksHarness.TENANT,
      actor: TasksHarness.ANA,
      title,
      description,
    });
  }
}
