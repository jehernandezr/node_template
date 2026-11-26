import { ActingMember } from '@platform/auth';
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
import { CreateTask } from '../application/create-task.use-case.js';
import { DeleteTask } from '../application/delete-task.use-case.js';
import { GetTask } from '../application/get-task.query.js';
import { ListTasks } from '../application/list-tasks.query.js';
import { UpdateTask } from '../application/update-task.use-case.js';

/** HTTP routes of the tasks of the actor's tenant. */
@Resource(TasksResource.Tasks)
export class TasksController {
  constructor(
    private readonly listTasks: ListTasks,
    private readonly getTask: GetTask,
    private readonly createTask: CreateTask,
    private readonly updateTask: UpdateTask,
    private readonly deleteTask: DeleteTask,
  ) {}

  /**
   * Lists or searches the tasks of the actor's tenant.
   * @param input Filters, search text, cursor and page size.
   * @param actor Signed-in actor; its tenant is read.
   * @returns One page of tasks.
   */
  @Endpoint(ListTasksRoute)
  @Quota(UsageMetric.ApiCalls)
  list(
    @Input() input: ListTasksRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<TaskPage> {
    return this.listTasks.execute(ActingMember.of(actor).tenantId, input);
  }

  /**
   * Reads one task of the actor's tenant.
   * @param input Task id.
   * @param actor Signed-in actor.
   * @returns The task.
   */
  @Endpoint(GetTaskRoute)
  @Quota(UsageMetric.ApiCalls)
  get(
    @Input() input: GetTaskRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<Task> {
    return this.getTask.execute(ActingMember.of(actor).tenantId, input.taskId);
  }

  /**
   * Creates a task in the actor's tenant.
   * @param input Task fields.
   * @param actor Signed-in actor, its author.
   * @returns The created task.
   */
  @Endpoint(CreateTaskRoute)
  @Quota(UsageMetric.ApiCalls)
  create(
    @Input() input: CreateTaskRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<Task> {
    const member = ActingMember.of(actor);
    return this.createTask.execute({
      tenantId: member.tenantId,
      actor: member.ref,
      title: input.title,
      description: input.description,
    });
  }

  /**
   * Changes a task of the actor's tenant.
   * @param input Task id, expected version and changes.
   * @param actor Signed-in actor, its editor.
   * @returns The task after the change.
   */
  @Endpoint(UpdateTaskRoute)
  @Quota(UsageMetric.ApiCalls)
  update(
    @Input() input: UpdateTaskRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<Task> {
    const member = ActingMember.of(actor);
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

  /**
   * Deletes a task of the actor's tenant.
   * @param input Task id.
   * @param actor Signed-in actor.
   */
  @Endpoint(DeleteTaskRoute)
  @Quota(UsageMetric.ApiCalls)
  async delete(
    @Input() input: DeleteTaskRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    const member = ActingMember.of(actor);
    await this.deleteTask.execute({
      tenantId: member.tenantId,
      actor: member.ref,
      taskId: input.taskId,
    });
  }
}
