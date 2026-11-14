import { ArtifactWriter } from '../artifact-writer.js';
import { RecordingExportMode } from './utils/recording-export-mode.js';
import { IndentedJsonRenderer } from './utils/indented-json-renderer.js';

describe('ArtifactWriter', () => {
  describe('write', () => {
    it('renders each artifact and hands it to the mode in order', async () => {
      const mode = new RecordingExportMode();
      const writer = new ArtifactWriter(new IndentedJsonRenderer(), mode);

      const report = await writer.write([
        { path: '/a', value: { n: 1 } },
        { path: '/b', value: [2] },
      ]);

      expect(mode.applied).toEqual([
        { path: '/a', content: '{\n  "n": 1\n}\n' },
        { path: '/b', content: '[\n  2\n]\n' },
      ]);
      expect(report).toEqual({ ok: true, lines: ['/a', '/b'] });
    });
  });
});
