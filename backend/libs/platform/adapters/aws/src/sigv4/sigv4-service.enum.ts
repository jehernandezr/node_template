/** AWS service name used for signing: the destination verifies it with IAM. */
export enum SigV4Service {
  /** API Gateway, and the ALB or internal API behind it. */
  ExecuteApi = 'execute-api',
  /** Lambda function URL with `AWS_IAM` authorization. */
  Lambda = 'lambda',
}
