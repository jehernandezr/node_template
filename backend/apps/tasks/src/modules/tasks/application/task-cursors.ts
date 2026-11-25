import { Injectable } from '@nestjs/common';
import { CursorCodec, IdCursor } from '@platform/criteria';

/**
 * Opaque cursors for task pages. The list pages by the id of the last task (UUIDv7, ordered by creation); the search,
 * by the position within the ranking; the changes, by change date and id.
 */
@Injectable()
export class TaskCursors {
  private static readonly SEARCH = 'search';

  constructor(
    private readonly ids: IdCursor,
    private readonly codec: CursorCodec,
  ) {}

  /** The cursor of the list page that starts after this task. */
  afterTask(taskId: string): string {
    return this.ids.after(taskId);
  }

  /**
   * The task a list cursor points after, or `undefined` for the first page.
   * @throws CriteriaError `InvalidValue` if the cursor is malformed.
   */
  taskOf(cursor: string | undefined): string | undefined {
    return this.ids.idOf(cursor);
  }

  /** The cursor of the search page that starts at this position of the ranking. */
  afterPosition(offset: number): string {
    return this.codec.encode({ id: TaskCursors.SEARCH, values: [offset] });
  }

  /**
   * The ranking position a search cursor points to, or 0 for the first page.
   * @throws CriteriaError `InvalidValue` if the cursor is malformed.
   */
  positionOf(cursor: string | undefined): number {
    if (cursor === undefined) {
      return 0;
    }
    const [offset] = this.codec.decode(cursor).values;
    return typeof offset === 'number' ? offset : 0;
  }

  /** The cursor of the changes page that starts after this change. */
  afterChange(updatedAt: Date, taskId: string): string {
    return this.codec.encode({ id: taskId, values: [updatedAt.toISOString()] });
  }

  /**
   * The change a changes cursor points after, or `undefined` for the first page.
   * @throws CriteriaError `InvalidValue` if the cursor is malformed.
   */
  changeOf(
    cursor: string | undefined,
  ): { readonly updatedAt: Date; readonly id: string } | undefined {
    if (cursor === undefined) {
      return undefined;
    }
    const decoded = this.codec.decode(cursor);
    const [updatedAt] = decoded.values;
    return { updatedAt: new Date(String(updatedAt)), id: decoded.id };
  }
}
