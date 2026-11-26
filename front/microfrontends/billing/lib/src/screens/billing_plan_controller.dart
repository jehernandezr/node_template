import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/billing_repository.dart';
import '../shared/types/billing_types.dart';

/// State of the plan page: subscription and usage, loaded together.
///
/// Future.wait keeps the original error; a record of futures would wrap it in a ParallelWaitError, which is an Error and escapes the loader.
final class BillingPlanController extends ChangeNotifier {
  /// Controller over [repository]; call `start` once.
  BillingPlanController(BillingRepository repository)
    : _loader = AsyncLoader<PlanOverview>(() => _fetch(repository)) {
    _loader.addListener(notifyListeners);
  }

  final AsyncLoader<PlanOverview> _loader;

  /// Subscription and usage: loading, loaded or failed.
  AsyncValue<PlanOverview> get overview => _loader.value;

  /// Loads the subscription and the usage in parallel. Calling it again
  /// reloads.
  Future<void> start() => _loader.load();

  static Future<PlanOverview> _fetch(BillingRepository repository) async {
    final subscription = repository.currentSubscription();
    final usage = repository.currentUsage();
    await Future.wait<Object?>([subscription, usage]);
    return PlanOverview(subscription: await subscription, usage: await usage);
  }

  @override
  void dispose() {
    _loader.dispose();
    super.dispose();
  }
}
