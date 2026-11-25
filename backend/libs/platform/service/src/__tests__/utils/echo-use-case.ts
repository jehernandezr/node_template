import type { UseCase } from '@platform/kernel';

/** Use case that returns its input as is. */
export class EchoUseCase implements UseCase<string, string> {
  async execute(input: string): Promise<string> {
    return input;
  }
}
