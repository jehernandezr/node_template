/** Pasos del arranque que anotan los dobles para verificar su orden. */
export enum BootstrapStep {
  Configure = 'configure',
  EnableShutdownHooks = 'enableShutdownHooks',
  Listen = 'listen',
}
