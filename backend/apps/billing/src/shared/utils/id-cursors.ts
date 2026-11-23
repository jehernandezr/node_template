import { CursorCodec } from '@platform/criteria';

/** Cursores opacos de páginas ordenadas por id UUIDv7: el cursor guarda el id del último elemento. */
export class IdCursors {
  private readonly codec = new CursorCodec();

  after(id: string): string {
    return this.codec.encode({ id, values: [] });
  }

  idOf(cursor: string | undefined): string | undefined {
    return cursor === undefined ? undefined : this.codec.decode(cursor).id;
  }
}
