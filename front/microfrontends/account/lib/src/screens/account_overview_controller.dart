import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/account_repository.dart';
import '../shared/enums/account_enums.dart';
import '../shared/types/account_types.dart';

/// State of the account overview: the profile, when the repository serves it.
final class AccountOverviewController extends ChangeNotifier {
  /// Controller over [repository]; call `start` once.
  AccountOverviewController(AccountRepository repository)
    : _repository = repository,
      _loader = AsyncLoader(() => _fetch(repository)) {
    _loader.addListener(notifyListeners);
  }

  final AccountRepository _repository;
  final AsyncLoader<AccountProfile?> _loader;

  /// The profile, or null data when the repository does not serve it.
  AsyncValue<AccountProfile?> get profile => _loader.value;

  /// Whether the repository serves [capability].
  bool can(AccountCapability capability) =>
      _repository.capabilities.contains(capability);

  /// Loads the profile.
  Future<void> start() => _loader.load();

  static Future<AccountProfile?> _fetch(AccountRepository repository) async =>
      repository.capabilities.contains(AccountCapability.profile)
      ? repository.loadProfile()
      : null;

  @override
  void dispose() {
    _loader.dispose();
    super.dispose();
  }
}
