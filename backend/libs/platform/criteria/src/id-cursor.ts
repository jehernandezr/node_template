import type { CursorCodec } from './cursor-codec.js';

/** Opaque cursors for pages ordered by UUIDv7 id: the cursor stores the id of the last item of the page. */
export class IdCursor {
  constructor(private readonly codec: CursorCodec) {}

  /** The cursor of the page that starts right after the item with this id. */
  after(id: string): string {
    return this.codec.encode({ id, values: [] });
  }

  /**
   * The id stored in a cursor, or `undefined` for the first page.
   * @throws CriteriaError `InvalidValue` if the cursor is malformed or tampered with.
   */
  idOf(cursor: string | undefined): string | undefined {
    return cursor === undefined ? undefined : this.codec.decode(cursor).id;
  }
}
