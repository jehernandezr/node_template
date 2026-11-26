import '../shared/types/billing_types.dart';

/// State of the change-plan sheet. Closed, so the sheet cannot show a mix.
sealed class ChangePlanState {
  const ChangePlanState();
}

/// The plans are loading.
final class ChangePlanLoading extends ChangePlanState {
  /// The plans are loading.
  const ChangePlanLoading();
}

/// The plans loaded and the user is picking one.
final class ChangePlanChoosing extends ChangePlanState {
  /// The user picks among [plans]; [selectedId] is the current choice.
  const ChangePlanChoosing(this.plans, this.selectedId);

  /// Plans on offer.
  final List<Plan> plans;

  /// Plan picked so far, or null.
  final String? selectedId;
}

/// The change of [selectedId] is being saved.
final class ChangePlanSaving extends ChangePlanState {
  /// The change to [selectedId] is being saved.
  const ChangePlanSaving(this.plans, this.selectedId);

  /// Plans on offer.
  final List<Plan> plans;

  /// Plan being saved.
  final String selectedId;
}

/// Loading the plans or saving the change failed. [plans] is empty when the
/// plans themselves did not load.
final class ChangePlanFailed extends ChangePlanState {
  /// The change failed with [error].
  const ChangePlanFailed(this.plans, this.selectedId, this.error);

  /// Plans on offer.
  final List<Plan> plans;

  /// Plan that was being saved, if any.
  final String? selectedId;

  /// Error of the change.
  final Object error;
}

/// The change was saved.
final class ChangePlanDone extends ChangePlanState {
  /// The plan changed.
  const ChangePlanDone();
}
