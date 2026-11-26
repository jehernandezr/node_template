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
 * `TaskSearch` over `@platform/search`: indexes title and description, and builds the page with the current
 * tasks among the results. The index does not know the status, so with a status filter the ranking is walked
 * in batches until the page is full, the ranking is exhausted or `MAX_BATCHES` batches are read: a page can be
 * short, or empty, and still carry a cursor. The cursor points to the ranking position where reading continues.
 */
@Injectable()
export class PlatformTaskSearch extends TaskSearch {
  /** Cap on index reads per request, so an unusual status does not walk the whole ranking at once. */
  static readonly MAX_BATCHES = 5;

  constructor(
    private readonly documents: SearchIndex,
    private readonly tasks: TaskRepository,
  ) {
    super();
  }

  override index(task: Task): Promise<void> {
    const state = task.snapshot();
    return this.documents.index({
      collection: TasksSearchCollection.Tasks,
      id: state.id,
      text: `${state.title}\n${state.description}`,
    });
  }

  override remove(taskId: string): Promise<void> {
    return this.documents.remove(TasksSearchCollection.Tasks, taskId);
  }

  override async search(query: TaskSearchQuery): Promise<TaskSearchResult> {
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

  /** The current tasks of the requested status, with their position in the ranking. */
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
