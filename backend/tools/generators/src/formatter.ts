/** Formats the generated output with the repository style, so it passes `nx format:check` with no extra step. */
export abstract class Formatter {
  /** Returns the text as is if the extension is not one that gets formatted. */
  abstract format(path: string, content: string): Promise<string>;
}
