import { ClientPlatform } from '@contracts/identity';

const PATTERNS: ReadonlyArray<readonly [RegExp, ClientPlatform]> = [
  [/iphone|ipad|ios/i, ClientPlatform.Ios],
  [/android/i, ClientPlatform.Android],
  [/mac os|macintosh/i, ClientPlatform.Macos],
  [/windows/i, ClientPlatform.Windows],
  [/linux/i, ClientPlatform.Linux],
];

/** Approximate platform from the `User-Agent`. Without hints, web. */
export function platformFromUserAgent(userAgent?: string): ClientPlatform {
  if (userAgent === undefined) {
    return ClientPlatform.Web;
  }
  return (
    PATTERNS.find(([pattern]) => pattern.test(userAgent))?.[1] ??
    ClientPlatform.Web
  );
}

/** Readable device name for the session list: the trimmed `User-Agent` or the platform. */
export function deviceNameFrom(userAgent?: string): string {
  const trimmed = userAgent?.trim().slice(0, 120);
  return trimmed === undefined || trimmed === ''
    ? platformFromUserAgent(userAgent)
    : trimmed;
}
