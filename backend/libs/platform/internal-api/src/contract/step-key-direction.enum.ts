/** Último tramo de la llave de idempotencia de un paso de saga: el paso hacia delante o su compensación. */
export enum StepKeyDirection {
  Forward = 'forward',
  Compensate = 'compensate',
}
