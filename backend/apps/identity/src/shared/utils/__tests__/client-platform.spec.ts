import { ClientPlatform } from '@contracts/identity';
import { deviceNameFrom, platformFromUserAgent } from '../client-platform.js';

describe('client platform', () => {
  it.each([
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
      ClientPlatform.Ios,
    ],
    ['Mozilla/5.0 (Linux; Android 15)', ClientPlatform.Android],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0)', ClientPlatform.Macos],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', ClientPlatform.Windows],
    ['Mozilla/5.0 (X11; Linux x86_64)', ClientPlatform.Linux],
    ['curl/8.0', ClientPlatform.Web],
    [undefined, ClientPlatform.Web],
  ])('reads %s as %s', (userAgent, platform) => {
    expect(platformFromUserAgent(userAgent)).toBe(platform);
  });

  it('names the device after the user agent, or the platform without one', () => {
    expect(deviceNameFrom('  Safari en iPhone  ')).toBe('Safari en iPhone');
    expect(deviceNameFrom('x'.repeat(200))).toHaveLength(120);
    expect(deviceNameFrom(undefined)).toBe(ClientPlatform.Web);
  });
});
