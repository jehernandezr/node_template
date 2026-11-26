/** Formats the generated output with the repository style, so it passes `nx format:check` with no extra step. */
export abstract class Formatter {
  /**
   * Formats a generated file with prettier.
   * Returns the text as is if the extension is not one that gets formatted.
   * @param path Path that decides the parser.
   * @param content Text to format.
   * @returns The formatted text.
   */
  abstract format(path: string, content: string): Promise<string>;
}
