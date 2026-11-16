import { ContainerProbe } from './container-probe.js';

/** Sonda de prueba con respuesta fija que cuenta cuántas veces la consultaron. */
export class FakeContainerProbe extends ContainerProbe {
  calls = 0;

  constructor(private readonly running: boolean) {
    super();
  }

  isRunning(): boolean {
    this.calls += 1;
    return this.running;
  }
}
