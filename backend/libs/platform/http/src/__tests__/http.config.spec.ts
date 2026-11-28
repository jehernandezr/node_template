import { ConfigLoader, ConfigValidationError } from '@platform/config';
import { httpConfigSchema } from '../http.config.js';

describe('httpConfigSchema', () => {
  const issuesOf = (WEB_ORIGINS: string): readonly string[] => {
    try {
      new ConfigLoader({ WEB_ORIGINS }).load(httpConfigSchema);
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        return error.issues.map((issue) => issue.path);
      }
      throw error;
    }
    return [];
  };

  it('reads WEB_ORIGINS as a list of origins', () => {
    const settings = new ConfigLoader({
      WEB_ORIGINS: 'https://app.dev.example.com, http://localhost:5173',
    }).load(httpConfigSchema);

    expect(settings.WEB_ORIGINS).toEqual([
      'https://app.dev.example.com',
      'http://localhost:5173',
    ]);
  });

  it('allows no origin at all', () => {
    expect(new ConfigLoader({}).load(httpConfigSchema).WEB_ORIGINS).toEqual([]);
  });

  it.each([
    ['not-a-url'],
    ['app.example.com'],
    ['https://app.example.com/'],
    ['https://app.example.com/login'],
    ['ftp://app.example.com'],
  ])('rejects %s, which no browser sends as an Origin', (origin) => {
    expect(issuesOf(`https://app.example.com,${origin}`)).toEqual([
      'WEB_ORIGINS.1',
    ]);
  });
});
