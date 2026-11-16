/** Qué hacen las pruebas de integración cuando no hay un runtime de contenedores. */
export enum IntegrationMode {
  /** Se omiten sin avisar de falla. */
  Skip = 'skip',
  /** Fallan: un entorno sin contenedores no puede dar por buena la corrida. */
  Require = 'require',
}
