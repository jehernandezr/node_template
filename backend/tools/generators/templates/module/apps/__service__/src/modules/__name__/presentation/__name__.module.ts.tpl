import { Module } from '@nestjs/common';
import { __Name__Facade } from '../application/__name__.facade.js';
import { Local__Name__Facade } from '../application/local-__name__.facade.js';

/** __name__ module: exposes its facade to the other modules of the service. */
@Module({
  providers: [{ provide: __Name__Facade, useClass: Local__Name__Facade }],
  exports: [__Name__Facade],
})
export class __Name__Module {}
