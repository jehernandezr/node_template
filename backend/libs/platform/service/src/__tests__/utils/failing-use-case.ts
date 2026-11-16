import type { UseCase } from '@platform/kernel';

/** Caso de uso que siempre lanza el error con el que se construyó. */
export class FailingUseCase implements UseCase<string, never> {
  constructor(private readonly failure: Error) {}

  async execute(): Promise<never> {
    throw this.failure;
  }
}
