/** Consecutivo de facturas por tenant y serie, sin huecos ni repetidos aunque dos cierres corran a la vez. */
export abstract class InvoiceNumbering {
  abstract next(series: string): Promise<number>;
}
