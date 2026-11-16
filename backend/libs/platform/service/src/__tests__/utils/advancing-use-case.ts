import type { Clock, UseCase } from '@platform/kernel';

/** Caso de uso que adelanta el reloj un tiempo conocido, para fijar la duración que se registra. */
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
