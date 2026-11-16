/** Averigua si hay un runtime de contenedores listo para Testcontainers. */
export abstract class ContainerProbe {
  abstract isRunning(): boolean;
}
