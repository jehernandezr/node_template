import { StepKeyDirection } from './step-key-direction.enum.js';

/**
 * Convención de llaves que comparten un paso y su compensación: `<base>:forward` y `<base>:compensate`, con la misma
 * base. La usan las sagas al llamar y el servidor para poner la lápida del paso que se deshace.
 */
export class CompensationKey {
  /** Huella de la lápida: ninguna entrada real la produce, así que un claim con ella nunca se confunde con un paso. */
  static readonly TOMBSTONE_FINGERPRINT = 'compensated-step-tombstone';
  private static readonly SEPARATOR = ':';

  /** La llave de `base` en la dirección dada. */
  static of(base: string, direction: StepKeyDirection): string {
    return `${base}${CompensationKey.SEPARATOR}${direction}`;
  }

  /** La llave hacia delante que deshace una llave de compensación, o `undefined` si no sigue la convención. */
  static forwardOf(key: string): string | undefined {
    const suffix = `${CompensationKey.SEPARATOR}${StepKeyDirection.Compensate}`;
    if (!key.endsWith(suffix) || key.length === suffix.length) {
      return undefined;
    }
    return CompensationKey.of(
      key.slice(0, -suffix.length),
      StepKeyDirection.Forward,
    );
  }
}
