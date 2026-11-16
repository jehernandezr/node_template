/** Atributos del span de cada paso de saga. */
export enum SagaSpanAttribute {
  SagaType = 'platform.saga.type',
  SagaId = 'platform.saga.id',
  StepIndex = 'platform.saga.step',
  Direction = 'platform.saga.direction',
  Operation = 'platform.saga.operation',
}
