import { CursorCodec } from '@platform/criteria';

/** Opaque cursors for pages ordered by UUIDv7 id: the cursor stores the id of the last item. */
export class IdCursors {
  private readonly codec = new CursorCodec();

  after(id: string): string {
    return this.codec.encode({ id, values: [] });
  }

  idOf(cursor: string | undefined): string | undefined {
    return cursor === undefined ? undefined : this.codec.decode(cursor).id;
  }
}
