import { ExportError } from '../export-error.js';

describe('ExportError', () => {
  describe('factories', () => {
    it.each<[string, () => ExportError, string]>([
      [
        'forService',
        () => ExportError.forService('identity', 'x'),
        'contracts-export (identity): x',
      ],
      ['forTopology', () => ExportError.forTopology('x'), 'topology-export: x'],
      [
        'forAsyncApi',
        () => ExportError.forAsyncApi('identity', 'x'),
        'asyncapi (identity): x',
      ],
    ])(
      '%s builds an ExportError named ExportError with its message',
      (_name, build, message) => {
        const error = build();

        expect(error).toBeInstanceOf(ExportError);
        expect(error.name).toBe('ExportError');
        expect(error.message).toBe(message);
      },
    );
  });
});
