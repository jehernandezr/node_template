import { ServiceDefinitionValidator } from '@platform/service';
import { __nameCamel__Service } from '../__name__.service.js';

describe('__nameCamel__Service', () => {
  it('is a valid service definition for its contract', () => {
    expect(() =>
      new ServiceDefinitionValidator().validate(__nameCamel__Service),
    ).not.toThrow();
  });

});
