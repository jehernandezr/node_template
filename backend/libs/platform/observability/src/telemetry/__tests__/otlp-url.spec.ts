import { OtlpPath } from '../otlp-path.enum.js';
import { OtlpUrl } from '../otlp-url.js';

describe('OtlpUrl.of', () => {
  it('joins the endpoint and the signal path without duplicate slashes', () => {
    expect(OtlpUrl.of('http://localhost:4318', OtlpPath.Traces)).toBe(
      'http://localhost:4318/v1/traces',
    );
    expect(OtlpUrl.of('http://localhost:4318///', OtlpPath.Logs)).toBe(
      'http://localhost:4318/v1/logs',
    );
  });

  it('stays linear with many trailing slashes', () => {
    const endpoint = `http://collector${'/'.repeat(100_000)}`;
    const started = performance.now();

    expect(OtlpUrl.of(endpoint, OtlpPath.Metrics)).toBe(
      'http://collector/v1/metrics',
    );
    expect(performance.now() - started).toBeLessThan(250);
  });
});
