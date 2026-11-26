/** Formats a JSON value as text before writing it or comparing it with the one on disk. */
export abstract class ArtifactRenderer {
  /**
   * Renders an artifact as text in the format its path implies.
   * @param path Path of the artifact.
   * @param value Content to render.
   * @returns The formatted text.
   */
  abstract render(path: string, value: unknown): Promise<string>;
}
