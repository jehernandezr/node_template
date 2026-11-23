import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { RepositoryKit } from '@platform/persistence';
import { SearchIndex, SearchIndexFactory } from '@platform/search';
import { ShardKey } from '@platform/sharding';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { CreateTask } from '../application/create-task.use-case.js';
import { DeleteTask } from '../application/delete-task.use-case.js';
import { GetTask } from '../application/get-task.query.js';
import { ListTaskChanges } from '../application/list-task-changes.query.js';
import { ListTasks } from '../application/list-tasks.query.js';
import { LocalTasksFacade } from '../application/local-tasks.facade.js';
import { PurgeDeletedTasksJob } from '../application/purge-deleted-tasks.job.js';
import { TasksFacade } from '../application/tasks.facade.js';
import { UpdateTask } from '../application/update-task.use-case.js';
import { TaskMaintenance } from '../domain/task-maintenance.js';
import { TaskRepository } from '../domain/task.repository.js';
import { TaskSearch } from '../domain/task-search.js';
import { PlatformTaskSearch } from '../infrastructure/platform-task-search.js';
import { TaskEntity } from '../infrastructure/persistence/entities/task.entity.js';
import { TypeOrmTaskMaintenance } from '../infrastructure/persistence/typeorm-task-maintenance.js';
import { TypeOrmTaskRepository } from '../infrastructure/persistence/typeorm-task.repository.js';
import { TasksController } from './tasks.controller.js';

/** Tareas del tenant: rutas, búsqueda, eventos y la purga de borradas. Global solo para su fachada. */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [TaskEntity],
      sharding: { key: ShardKey.Tenant },
    }),
  ],
  controllers: [TasksController],
  providers: [
    TenantShard,
    { provide: TaskRepository, useClass: TypeOrmTaskRepository },
    { provide: TaskMaintenance, useClass: TypeOrmTaskMaintenance },
    {
      provide: SearchIndex,
      useFactory: (factory: SearchIndexFactory, kit: RepositoryKit) =>
        factory.create(kit),
      inject: [SearchIndexFactory, RepositoryKit],
    },
    { provide: TaskSearch, useClass: PlatformTaskSearch },
    ListTasks,
    GetTask,
    CreateTask,
    UpdateTask,
    DeleteTask,
    ListTaskChanges,
    PurgeDeletedTasksJob,
    { provide: TasksFacade, useClass: LocalTasksFacade },
  ],
  exports: [TasksFacade],
})
export class TasksModule {}
