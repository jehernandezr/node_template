/**
 * Type of a value that travels in the query of a GET or DELETE route. Defines how
 * the received text is converted before validating it with the contract schema.
 */
export enum QueryValueKind {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
}
