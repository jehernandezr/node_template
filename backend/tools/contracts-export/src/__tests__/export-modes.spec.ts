import { CheckMode } from '../check-mode.js';
import { WriteMode } from '../write-mode.js';
import { InMemoryFileSystem } from './utils/in-memory-file-system.js';

const UP_TO_DATE = 'Archivos generados al día.';

describe('export modes', () => {
  describe('WriteMode', () => {
    it('writes the content and reports each path it wrote', async () => {
      const fileSystem = new InMemoryFileSystem();
      const mode = new WriteMode(fileSystem);

      await mode.apply('/x/a.json', '{"a":1}\n');

      expect(fileSystem.contentOf('/x/a.json')).toBe('{"a":1}\n');
      expect(mode.report()).toEqual({
        ok: true,
        lines: ['Escrito /x/a.json'],
      });
    });
  });

  describe('CheckMode', () => {
    it('reports the files as up to date when they match the disk', async () => {
      const fileSystem = new InMemoryFileSystem({ '/x/a.json': 'igual' });
      const mode = new CheckMode(fileSystem);

      await mode.apply('/x/a.json', 'igual');

      expect(mode.report()).toEqual({ ok: true, lines: [UP_TO_DATE] });
    });

    it.each<[string, Record<string, string>]>([
      ['different', { '/x/a.json': 'otro' }],
      ['missing', {}],
    ])('reports drift when the file is %s', async (_label, files) => {
      const fileSystem = new InMemoryFileSystem(files);
      const mode = new CheckMode(fileSystem);

      await mode.apply('/x/a.json', 'igual');

      const report = mode.report();
      expect(report.ok).toBe(false);
      expect(report.lines[0]).toContain('\n  /x/a.json\n');
      expect(report.lines[0]).toContain(
        'Ejecuta: pnpm nx run contracts-export:export',
      );
    });
  });
});
