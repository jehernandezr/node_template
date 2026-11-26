/**
 * Quiet hours in the user's time zone. If the start is after the end, it crosses midnight
 * (`22:00` to `07:00`). A start equal to the end is an empty schedule.
 */
export class QuietHours {
  private static readonly MINUTES_PER_DAY = 24 * 60;

  private constructor(
    private readonly startMinute: number,
    private readonly endMinute: number,
    readonly timezone: string,
  ) {}

  /**
   * `undefined` if any time is not `HH:mm` or the zone is not IANA.
   * @param start Start time, `HH:mm`.
   * @param end End time, `HH:mm`.
   * @param timezone IANA zone.
   * @returns The quiet hours, or `undefined`.
   */
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

  /**
   * Tells whether an instant falls inside the quiet hours in their zone.
   * @param instant Instant to check.
   * @returns `true` when quiet.
   */
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
