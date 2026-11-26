import { Global, Module } from '@nestjs/common';
import { CursorCodec } from '../cursor-codec.js';
import { IdCursor } from '../id-cursor.js';

/**
 * The pagination cursors of the process: one `CursorCodec` and the `IdCursor` built on it, injected wherever a page
 * is read. It is global because every business module that pages needs them and they hold no business state.
 */
@Global()
@Module({
  providers: [
    { provide: CursorCodec, useFactory: () => new CursorCodec() },
    {
      provide: IdCursor,
      useFactory: (codec: CursorCodec) => new IdCursor(codec),
      inject: [CursorCodec],
    },
  ],
  exports: [CursorCodec, IdCursor],
})
export class CriteriaModule {}
