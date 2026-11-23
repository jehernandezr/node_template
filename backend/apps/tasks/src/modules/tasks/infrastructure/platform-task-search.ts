import { Injectable } from '@nestjs/common';
import { SearchIndex, type SearchHit } from '@platform/search';
import { TasksSearchCollection } from '../../../shared/enums/tasks-search-collection.enum.js';
import { TaskRepository } from '../domain/task.repository.js';
import {
  TaskSearch,
  type TaskSearchQuery,
  type TaskSearchResult,
} from '../domain/task-search.js';
import type { Task } from '../domain/task.js';

/**
 * `TaskSearch` sobre `@platform/search`: indexa título y descripción, y arma la página con las tareas
 * vigentes de los resultados. El índice no conoce el estado, así que con un filtro de estado se recorre el
 * ranking por tandas hasta llenar la página, agotarlo o leer `MAX_BATCHES` tandas: una página puede quedar
 * corta, o vacía, y aun así traer cursor. El cursor apunta a la posición del ranking donde sigue la lectura.
 */
@Injectable()
export class PlatformTaskSearch extends TaskSearch {
  /** Tope de lecturas al índice por petición, así un estado raro no recorre todo el ranking de una vez. */
  static readonly MAX_BATCHES = 5;

  constructor(
    private readonly documents: SearchIndex,
    private readonly tasks: TaskRepository,
  ) {
    super();
  }

  index(task: Task): Promise<void> {
    const state = task.snapshot();
    return this.documents.index({
      collection: TasksSearchCollection.Tasks,
      id: state.id,
      text: `${state.title}\n${state.description}`,
    });
  }

  remove(taskId: string): Promise<void> {
    return this.documents.remove(TasksSearchCollection.Tasks, taskId);
  }

  async search(query: TaskSearchQuery): Promise<TaskSearchResult> {
    const batch = query.limit + 1;
    const ranked: RankedTask[] = [];
    let offset = query.offset;
    let exhausted = false;
    for (
      let reads = 0;
      reads < PlatformTaskSearch.MAX_BATCHES &&
      ranked.length < batch &&
      !exhausted;
      reads += 1
    ) {
      const hits = await this.documents.search({
        collection: TasksSearchCollection.Tasks,
        text: query.text,
        limit: batch,
        offset,
      });
      ranked.push(...(await this.matching(hits, offset, query)));
      offset += hits.length;
      exhausted = hits.length < batch;
    }
    const nextOffset =
      ranked[query.limit]?.position ?? (exhausted ? undefined : offset);
    return {
      tasks: ranked.slice(0, query.limit).map((entry) => entry.task),
      ...(nextOffset === undefined ? {} : { nextOffset }),
    };
  }

  /** Las tareas vigentes del estado pedido, con su posición en el ranking. */
  private async matching(
    hits: readonly SearchHit[],
    offset: number,
    query: TaskSearchQuery,
  ): Promise<RankedTask[]> {
    const tasks = new Map(
      (await this.tasks.findMany(hits.map((hit) => hit.id))).map((task) => [
        task.id,
        task,
      ]),
    );
    return hits
      .map((hit, index) => ({
        task: tasks.get(hit.id),
        position: offset + index,
      }))
      .filter(
        (entry): entry is RankedTask =>
          entry.task !== undefined &&
          (query.status === undefined ||
            entry.task.snapshot().status === query.status),
      );
  }
}

interface RankedTask {
  readonly task: Task;
  readonly position: number;
}
