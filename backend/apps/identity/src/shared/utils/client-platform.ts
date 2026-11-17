import { ClientPlatform } from '@contracts/identity';

const PATTERNS: ReadonlyArray<readonly [RegExp, ClientPlatform]> = [
  [/iphone|ipad|ios/i, ClientPlatform.Ios],
  [/android/i, ClientPlatform.Android],
  [/mac os|macintosh/i, ClientPlatform.Macos],
  [/windows/i, ClientPlatform.Windows],
  [/linux/i, ClientPlatform.Linux],
];

/** Plataforma aproximada a partir del `User-Agent`. Sin pistas, la web. */
export function platformFromUserAgent(userAgent?: string): ClientPlatform {
  if (userAgent === undefined) {
    return ClientPlatform.Web;
  }
  return (
    PATTERNS.find(([pattern]) => pattern.test(userAgent))?.[1] ??
    ClientPlatform.Web
  );
}

/** Nombre legible del dispositivo para la lista de sesiones: el `User-Agent` recortado o la plataforma. */
export function deviceNameFrom(userAgent?: string): string {
  const trimmed = userAgent?.trim().slice(0, 120);
  return trimmed === undefined || trimmed === ''
    ? platformFromUserAgent(userAgent)
    : trimmed;
}
