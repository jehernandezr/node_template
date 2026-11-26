import { ContainerProbe } from './container-probe.js';

/** Test probe with a fixed answer that counts how many times it was queried. */
export class FakeContainerProbe extends ContainerProbe {
  calls = 0;

  constructor(private readonly running: boolean) {
    super();
  }

  override isRunning(): boolean {
    this.calls += 1;
    return this.running;
  }
}
