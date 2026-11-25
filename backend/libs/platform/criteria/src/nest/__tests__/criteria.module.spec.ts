import { Test } from '@nestjs/testing';
import { CursorCodec } from '../../cursor-codec.js';
import { IdCursor } from '../../id-cursor.js';
import { CriteriaModule } from '../criteria.module.js';

describe('CriteriaModule', () => {
  it('provides one codec and an IdCursor that reads what it writes', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CriteriaModule],
    }).compile();

    const cursors = moduleRef.get(IdCursor);

    expect(moduleRef.get(CursorCodec)).toBeInstanceOf(CursorCodec);
    expect(cursors.idOf(cursors.after('last-id'))).toBe('last-id');
    await moduleRef.close();
  });
});
