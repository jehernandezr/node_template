/** Formats a JSON value as text before writing it or comparing it with the one on disk. */
export abstract class ArtifactRenderer {
  abstract render(path: string, value: unknown): Promise<string>;
}
