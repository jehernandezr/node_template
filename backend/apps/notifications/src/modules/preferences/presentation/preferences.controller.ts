import { ActingUser } from '@platform/auth';
import {
  GetPreferencesRoute,
  SavePreferencesRoute,
  type NotificationPreferences,
} from '@contracts/notifications';
import type { Actor } from '@platform/auth';
import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import { NotificationsResource } from '../../../shared/enums/notifications-resource.enum.js';
import { ManagePreferences } from '../application/manage-preferences.use-case.js';

/** HTTP routes of the notification preferences of the signed-in user. */
@Resource(NotificationsResource.Preferences)
export class PreferencesController {
  constructor(private readonly preferences: ManagePreferences) {}

  /**
   * Reads the user's preferences, or the defaults.
   * @param actor Signed-in user.
   * @returns The preferences.
   */
  @Endpoint(GetPreferencesRoute)
  async get(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<NotificationPreferences> {
    return (await this.preferences.get(ActingUser.refOf(actor))).toView();
  }

  /**
   * Saves the user's preferences.
   * @param input Preferences to save.
   * @param actor Signed-in user.
   */
  @Endpoint(SavePreferencesRoute)
  save(
    @Input() input: NotificationPreferences,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    return this.preferences.save(ActingUser.refOf(actor), input);
  }
}
