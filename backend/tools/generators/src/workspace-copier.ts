/** Creates and deletes a copy of the workspace where the smoke test can generate without touching the repository. */
export abstract class WorkspaceCopier {
  /** @returns the root of the copy. */
  abstract copy(): Promise<string>;

  abstract remove(root: string): Promise<void>;
}
