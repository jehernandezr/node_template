import { GeneratorErrorReason } from '../generator-error.js';
import { NameForms } from '../name-forms.js';

describe('NameForms', () => {
  it('derives every form of a kebab-case name', () => {
    expect(NameForms.of('api-keys')).toEqual({
      kebab: 'api-keys',
      camel: 'apiKeys',
      pascal: 'ApiKeys',
      upperSnake: 'API_KEYS',
      snake: 'api_keys',
    });
  });

  it.each(['Inventory', 'api_keys', '1stock', 'stock-', ''])(
    'refuses %p, which is not kebab-case',
    (name) => {
      expect(() => NameForms.of(name)).toThrow(
        expect.objectContaining({ reason: GeneratorErrorReason.InvalidName }),
      );
    },
  );
});
