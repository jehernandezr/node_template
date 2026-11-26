import { CriteriaErrorCode } from '../errors/criteria-error-code.enum.js';
import { CursorCodec } from '../cursor-codec.js';
import { IdCursor } from '../id-cursor.js';

const ID = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';

describe('IdCursor', () => {
  it('reads back the id of the cursor it wrote', () => {
    const cursors = new IdCursor(new CursorCodec());

    expect(cursors.idOf(cursors.after(ID))).toBe(ID);
  });

  it('has no id for the first page', () => {
    expect(new IdCursor(new CursorCodec()).idOf(undefined)).toBeUndefined();
  });

  it('rejects a cursor signed with another secret', () => {
    const issued = new IdCursor(new CursorCodec('first-signing-value')).after(
      ID,
    );

    expect(() =>
      new IdCursor(new CursorCodec('second-signing-value')).idOf(issued),
    ).toThrow(
      expect.objectContaining({ code: CriteriaErrorCode.InvalidValue }),
    );
  });

  it('rejects a malformed cursor', () => {
    expect(() => new IdCursor(new CursorCodec()).idOf('%%')).toThrow(
      expect.objectContaining({ code: CriteriaErrorCode.InvalidValue }),
    );
  });
});
