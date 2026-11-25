import type { UseCase } from '@platform/kernel';

/** Use case that always throws the error it was built with. */
export class FailingUseCase implements UseCase<string, never> {
  constructor(private readonly failure: Error) {}

  async execute(): Promise<never> {
    throw this.failure;
  }
}
