import type { PersistenceFeature } from '../persistence-feature.js';
import type { ManagerIntent } from './manager-intent.enum.js';

/** What a repository requests from `EntityManagerProvider.run`. */
export interface ManagerRequest {
  readonly feature: PersistenceFeature;
  readonly source?: unknown;
  readonly intent: ManagerIntent;
}
