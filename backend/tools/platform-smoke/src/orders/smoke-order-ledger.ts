import { Injectable } from '@nestjs/common';

/** Counts how many times the consumer processed each message. With deduplication, it never exceeds one. */
@Injectable()
export class SmokeOrderLedger {
  private readonly counts = new Map<string, number>();

  record(messageId: string): void {
    this.counts.set(messageId, this.countOf(messageId) + 1);
  }

  countOf(messageId: string): number {
    return this.counts.get(messageId) ?? 0;
  }
}
