import {
  GetPreferencesRoute,
  SavePreferencesRoute,
  type NotificationPreferences,
} from '@contracts/notifications';
import type { Actor } from '@platform/auth';
import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import { NotificationsResource } from '../../../shared/enums/notifications-resource.enum.js';
import { UserOfActor } from '../../../shared/utils/user-of-actor.js';
import { ManagePreferences } from '../application/manage-preferences.use-case.js';

@Resource(NotificationsResource.Preferences)
export class PreferencesController {
  constructor(private readonly preferences: ManagePreferences) {}

  @Endpoint(GetPreferencesRoute)
  async get(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<NotificationPreferences> {
    return (await this.preferences.get(UserOfActor.of(actor))).toView();
  }

  @Endpoint(SavePreferencesRoute)
  save(
    @Input() input: NotificationPreferences,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    return this.preferences.save(UserOfActor.of(actor), input);
  }
}
