/** Finds out whether a container runtime is ready for Testcontainers. */
export abstract class ContainerProbe {
  abstract isRunning(): boolean;
}
