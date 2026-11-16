/** Una saga que el job no pudo retomar por un error. */
export interface RecoveryFailure {
  readonly sagaId: string;
  /** Código del `PlatformError`, o `PLATFORM.INTERNAL.UNEXPECTED` para cualquier otro error. */
  readonly errorCode: string;
  /** Código, o nombre y mensaje, del error, sin valores de entrada. */
  readonly detail: string;
}

/** Resultado de una pasada del job de recuperación. */
export interface RecoveryReport {
  readonly resumed: string[];
  readonly failed: RecoveryFailure[];
}
