import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';

import 'enums.dart';
import 'microfrontend_registry.dart';
import 'user_session.dart';

/// Path of the first visible menu entry for [session] on [platform], or null
/// when the session sees no menu entry.
String? homeLocation(
  MicrofrontendRegistry registry,
  UserSession session,
  AppPlatform platform,
) {
  final entries = registry.menuFor(session, platform);
  return entries.isEmpty ? null : entries.first.path;
}

/// Resets [session] to anonymous and navigates to [loginPath].
///
/// The location left behind is not passed as `from`: the user lands on the
/// plain login page.
Future<void> signOutAndGoToLogin({
  required GoRouter router,
  required ValueNotifier<UserSession> session,
  String loginPath = '/login',
}) async {
  session.value = UserSession.anonymous();
  router.go(loginPath);
}
