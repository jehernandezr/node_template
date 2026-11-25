import type { Clock, UseCase } from '@platform/kernel';

/** Use case that advances the clock by a known time, to fix the duration that is logged. */
export class AdvancingUseCase implements UseCase<string, string> {
  constructor(
    private readonly clock: Clock & { advance(ms: number): void },
    private readonly elapsedMs: number,
  ) {}

  async execute(input: string): Promise<string> {
    this.clock.advance(this.elapsedMs);
    return input;
  }
}
