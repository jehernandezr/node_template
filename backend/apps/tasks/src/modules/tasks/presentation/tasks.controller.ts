import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import type { Actor } from '@platform/auth';
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
  list(
    @Input() input: ListTasksRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<TaskPage> {
    return this.listTasks.execute(ActingMembers.of(actor).tenantId, input);
  }

  @Endpoint(GetTaskRoute)
  get(
    @Input() input: GetTaskRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<Task> {
    return this.getTask.execute(ActingMembers.of(actor).tenantId, input.taskId);
  }

  @Endpoint(CreateTaskRoute)
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
