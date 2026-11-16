import { Injectable } from '@nestjs/common';

/** Cuenta cuántas veces el consumidor procesó cada mensaje. Con la deduplicación, nunca pasa de uno. */
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
