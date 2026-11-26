import 'package:shell_core/shell_core.dart';

import '../data/notifications_data.dart' deferred as data;

/// Reaches the unread counter without putting the data library in the
/// initial bundle.
///
/// Deferred: the lifecycle ships in the initial web bundle with the manifest. The repository and its data download only when the lifecycle starts.
abstract final class UnreadCounts {
  /// Loads the data library and returns the unread counter of the repository
  /// of [scope], or null when the scope closed while the library loaded.
  static Future<Stream<int>?> load(MicrofrontendScope scope) async {
    await data.loadLibrary();
    if (scope.isDisposed) return null;
    return scope
        .repository(data.NotificationsData.repository)
        .watchUnreadCount();
  }
}
