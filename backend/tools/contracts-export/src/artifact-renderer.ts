/** Da formato de texto a un valor JSON antes de escribirlo o compararlo con el de disco. */
export abstract class ArtifactRenderer {
  abstract render(path: string, value: unknown): Promise<string>;
}
