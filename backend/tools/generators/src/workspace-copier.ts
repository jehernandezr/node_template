/** Creates and deletes a copy of the workspace where the smoke test can generate without touching the repository. */
export abstract class WorkspaceCopier {
  /**
   * Copies the workspace to a temporary folder.
   * @returns the root of the copy.
   */
  abstract copy(): Promise<string>;

  /**
   * Deletes a workspace copy.
   * @param root Root of the copy.
   */
  abstract remove(root: string): Promise<void>;
}
