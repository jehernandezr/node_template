/** Junta los elementos de un iterable asíncrono en un arreglo. */
export class AsyncBatches {
  static async collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
    const items: T[] = [];
    for await (const item of iterable) {
      items.push(item);
    }
    return items;
  }
}
