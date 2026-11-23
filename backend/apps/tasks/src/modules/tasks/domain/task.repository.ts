import type { UserRef } from '@contracts/platform';
import type { TaskChangesRequest } from './task-changes-request.js';
import type { TaskPageRequest } from './task-page-request.js';
import type { Task } from './task.js';

/** Tareas del tenant del `ShardScope` abierto. */
export abstract class TaskRepository {
  /** La tarea vigente, o `undefined` si no existe o está borrada. */
  abstract find(taskId: string): Promise<Task | undefined>;

  /** Las tareas vigentes con esos ids, en el orden pedido; las que no existen no aparecen. */
  abstract findMany(taskIds: readonly string[]): Promise<readonly Task[]>;

  /** Inserta la tarea nueva y devuelve su estado guardado. */
  abstract insert(task: Task): Promise<Task>;

  /**
   * Guarda los cambios de una tarea leída y devuelve su estado guardado.
   * @throws OptimisticLockError si otra escritura la cambió desde que se leyó.
   */
  abstract update(task: Task, actor: UserRef): Promise<Task>;

  /**
   * Guarda el borrado lógico de una tarea leída y devuelve su estado guardado.
   * @throws OptimisticLockError si otra escritura la cambió desde que se leyó.
   */
  abstract remove(task: Task, actor: UserRef): Promise<Task>;

  abstract page(request: TaskPageRequest): Promise<readonly Task[]>;

  /** Incluye las borradas: quien sincroniza necesita saber que dejaron de existir. */
  abstract changes(request: TaskChangesRequest): Promise<readonly Task[]>;
}
