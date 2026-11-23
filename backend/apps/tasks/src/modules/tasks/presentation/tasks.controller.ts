import { UsageMetric } from '@contracts/billing';
import type { Actor } from '@platform/auth';
import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import { Quota } from '@platform/quotas/nest';
import {
  CreateTaskRoute,
  DeleteTaskRoute,
  GetTaskRoute,
  ListTasksRoute,
  UpdateTaskRoute,
  type CreateTaskRequest,
  type DeleteTaskRequest,
  type GetTaskRequest,
  type ListTasksRequest,
  type Task,
  type TaskPage,
  type UpdateTaskRequest,
} from '@contracts/tasks';
import { TasksResource } from '../../../shared/enums/tasks-resource.enum.js';
import { ActingMembers } from '../../../shared/utils/acting-member.js';
import { CreateTask } from '../application/create-task.use-case.js';
import { DeleteTask } from '../application/delete-task.use-case.js';
import { GetTask } from '../application/get-task.query.js';
import { ListTasks } from '../application/list-tasks.query.js';
import { UpdateTask } from '../application/update-task.use-case.js';

@Resource(TasksResource.Tasks)
export class TasksController {
  constructor(
    private readonly listTasks: ListTasks,
    private readonly getTask: GetTask,
    private readonly createTask: CreateTask,
    private readonly updateTask: UpdateTask,
    private readonly deleteTask: DeleteTask,
  ) {}

  @Endpoint(ListTasksRoute)
  @Quota(UsageMetric.ApiCalls)
  list(
    @Input() input: ListTasksRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<TaskPage> {
    return this.listTasks.execute(ActingMembers.of(actor).tenantId, input);
  }

  @Endpoint(GetTaskRoute)
  @Quota(UsageMetric.ApiCalls)
  get(
    @Input() input: GetTaskRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<Task> {
    return this.getTask.execute(ActingMembers.of(actor).tenantId, input.taskId);
  }

  @Endpoint(CreateTaskRoute)
  @Quota(UsageMetric.ApiCalls)
  create(
    @Input() input: CreateTaskRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<Task> {
    const member = ActingMembers.of(actor);
    return this.createTask.execute({
      tenantId: member.tenantId,
      actor: member.ref,
      title: input.title,
      description: input.description,
    });
  }

  @Endpoint(UpdateTaskRoute)
  @Quota(UsageMetric.ApiCalls)
  update(
    @Input() input: UpdateTaskRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<Task> {
    const member = ActingMembers.of(actor);
    return this.updateTask.execute({
      tenantId: member.tenantId,
      actor: member.ref,
      taskId: input.taskId,
      changes: {
        title: input.title,
        description: input.description,
        status: input.status,
      },
      expectedVersion: input.expectedVersion,
    });
  }

  @Endpoint(DeleteTaskRoute)
  @Quota(UsageMetric.ApiCalls)
  async delete(
    @Input() input: DeleteTaskRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    const member = ActingMembers.of(actor);
    await this.deleteTask.execute({
      tenantId: member.tenantId,
      actor: member.ref,
      taskId: input.taskId,
    });
  }
}
