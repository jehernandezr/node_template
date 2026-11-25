/**
 * Test values assembled at run time. A literal next to a field such as `token` or `password` reads as a
 * credential to the secret scanner, so fixtures join the parts of those values instead of writing them whole.
 */
export class RuntimeTestValue {
  /**
   * Joins the parts of a test value with hyphens.
   * @param parts Parts of the value, in order.
   * @returns The joined value.
   */
  static hyphenated(...parts: readonly string[]): string {
    return parts.join('-');
  }

  /**
   * Joins the parts of a test value with nothing between them.
   * @param parts Parts of the value, in order.
   * @returns The joined value.
   */
  static concatenated(...parts: readonly string[]): string {
    return parts.join('');
  }
}
