import { CursorCodec } from '@platform/criteria';

/**
 * Opaque cursors for task pages. The list pages by the id of the last task (UUIDv7, ordered
 * by creation); the search, by the position within the ranking; the changes, by change date and id.
 */
export class TaskCursors {
  private static readonly SEARCH = 'search';
  private readonly codec = new CursorCodec();

  afterTask(taskId: string): string {
    return this.codec.encode({ id: taskId, values: [] });
  }

  taskOf(cursor: string | undefined): string | undefined {
    return cursor === undefined ? undefined : this.codec.decode(cursor).id;
  }

  afterPosition(offset: number): string {
    return this.codec.encode({ id: TaskCursors.SEARCH, values: [offset] });
  }

  positionOf(cursor: string | undefined): number {
    if (cursor === undefined) {
      return 0;
    }
    const [offset] = this.codec.decode(cursor).values;
    return typeof offset === 'number' ? offset : 0;
  }

  afterChange(updatedAt: Date, taskId: string): string {
    return this.codec.encode({ id: taskId, values: [updatedAt.toISOString()] });
  }

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
