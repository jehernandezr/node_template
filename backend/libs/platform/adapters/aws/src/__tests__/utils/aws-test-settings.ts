/** Ajustes de AWS para las pruebas: la región y la cuenta de LocalStack. */
export const AWS_TEST_SETTINGS = {
  AWS_REGION: 'us-east-1',
  AWS_ACCOUNT_ID: '000000000000',
  MESSAGING_NAME_PREFIX: 'test',
} as const;
