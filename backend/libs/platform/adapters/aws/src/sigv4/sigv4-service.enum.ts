/** Nombre de servicio de AWS con el que se firma: el destino lo verifica con IAM. */
export enum SigV4Service {
  /** API Gateway, y el ALB o la API interna detrás de ella. */
  ExecuteApi = 'execute-api',
  /** URL de función de Lambda con autorización `AWS_IAM`. */
  Lambda = 'lambda',
}
