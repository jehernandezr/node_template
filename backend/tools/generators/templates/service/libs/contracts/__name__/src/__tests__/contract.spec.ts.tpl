import { __nameCamel__Contract } from '../contract.js';
import { __Name__Operation } from '../enums/identifiers.enum.js';

describe('__nameCamel__Contract', () => {
  it('declares every __Name__Operation value exactly once', () => {
    expect(
      Object.values(__nameCamel__Contract.operations)
        .map((operation) => operation.id)
        .sort(),
    ).toEqual(Object.values(__Name__Operation).sort());
  });
});
