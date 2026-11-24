import { Test } from '@nestjs/testing';
import { __Name__Facade } from '../application/__name__.facade.js';
import { Local__Name__Facade } from '../application/local-__name__.facade.js';
import { __Name__Module } from '../presentation/__name__.module.js';

describe('__Name__Module', () => {
  it('offers its facade to the other modules of the service', async () => {
    const module = await Test.createTestingModule({
      imports: [__Name__Module],
    }).compile();

    expect(module.get(__Name__Facade)).toBeInstanceOf(Local__Name__Facade);
  });
});
