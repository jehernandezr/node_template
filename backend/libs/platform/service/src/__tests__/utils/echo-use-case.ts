import type { UseCase } from '@platform/kernel';

/** Caso de uso que devuelve su entrada tal cual. */
export class EchoUseCase implements UseCase<string, string> {
  async execute(input: string): Promise<string> {
    return input;
  }
}
