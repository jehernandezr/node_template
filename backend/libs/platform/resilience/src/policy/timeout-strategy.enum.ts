/** Cómo se hace cumplir el tiempo de un intento. */
export enum TimeoutStrategy {
  /** Aborta la señal y espera a que la operación la respete. */
  Cooperative = 'cooperative',
  /** Rechaza en cuanto vence el tiempo, aunque la operación siga corriendo. */
  Aggressive = 'aggressive',
}
