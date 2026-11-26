import {
  TaskSearch,
  type TaskSearchQuery,
  type TaskSearchResult,
} from '../../domain/task-search.js';
import type { Task } from '../../domain/task.js';
import type { TaskRepository } from '../../domain/task.repository.js';

/** In-memory search: finds the indexed tasks whose text contains all the searched words. */
export class InMemoryTaskSearch extends TaskSearch {
  private readonly texts = new Map<string, string>();

  constructor(private readonly tasks: TaskRepository) {
    super();
  }

  override async index(task: Task): Promise<void> {
    const state = task.snapshot();
    this.texts.set(
      state.id,
      `${state.title} ${state.description}`.toLowerCase(),
    );
  }

  override async remove(taskId: string): Promise<void> {
    this.texts.delete(taskId);
  }

  indexed(): string[] {
    return [...this.texts.keys()];
  }

  override async search(query: TaskSearchQuery): Promise<TaskSearchResult> {
    const words = query.text.toLowerCase().split(/\s+/).filter(Boolean);
    const ids = [...this.texts.entries()]
      .filter(([, text]) => words.every((word) => text.includes(word)))
      .map(([id]) => id);
    const matching = (await this.tasks.findMany(ids)).filter(
      (task) =>
        query.status === undefined || task.snapshot().status === query.status,
    );
    const page = matching.slice(query.offset, query.offset + query.limit);
    const more = matching.length > query.offset + query.limit;
    return {
      tasks: page,
      ...(more ? { nextOffset: query.offset + query.limit } : {}),
    };
  }
}
