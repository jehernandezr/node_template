/**
 * Horario de silencio en la zona del usuario. Si el inicio es posterior al fin, cruza la medianoche
 * (`22:00` a `07:00`). Inicio igual a fin es un horario vacío.
 */
export class QuietHours {
  private static readonly MINUTES_PER_DAY = 24 * 60;

  private constructor(
    private readonly startMinute: number,
    private readonly endMinute: number,
    readonly timezone: string,
  ) {}

  /** `undefined` si alguna hora no es `HH:mm` o la zona no es IANA. */
  static parse(
    start: string,
    end: string,
    timezone: string,
  ): QuietHours | undefined {
    const startMinute = QuietHours.minuteOf(start);
    const endMinute = QuietHours.minuteOf(end);
    if (
      startMinute === undefined ||
      endMinute === undefined ||
      !QuietHours.isZone(timezone)
    ) {
      return undefined;
    }
    return new QuietHours(startMinute, endMinute, timezone);
  }

  contains(instant: Date): boolean {
    const minute = this.localMinute(instant);
    if (this.startMinute === this.endMinute) {
      return false;
    }
    return this.startMinute < this.endMinute
      ? minute >= this.startMinute && minute < this.endMinute
      : minute >= this.startMinute || minute < this.endMinute;
  }

  private localMinute(instant: Date): number {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: this.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(instant);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value);
    return (hour * 60 + minute) % QuietHours.MINUTES_PER_DAY;
  }

  private static minuteOf(time: string): number | undefined {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
    return match === null
      ? undefined
      : Number(match[1]) * 60 + Number(match[2]);
  }

  private static isZone(timezone: string): boolean {
    try {
      new Intl.DateTimeFormat('en-GB', { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }
}
