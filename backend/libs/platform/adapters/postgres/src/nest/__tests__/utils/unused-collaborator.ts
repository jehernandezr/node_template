/**
 * Marker that stands in for a dependency the module only receives. The `PostgresPlatformModule` factories
 * store the reference without using it at construction, so a distinct object per token is enough to check the wiring.
 */
export class UnusedCollaborator {
  constructor(readonly role: string) {}
}
