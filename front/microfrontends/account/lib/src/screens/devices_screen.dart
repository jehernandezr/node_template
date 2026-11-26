import 'package:contracts/contracts.dart' show DeviceSummary;
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart' show formatDate;

import '../data/account_repository.dart';
import '../l10n/account_labels.dart';
import '../l10n/generated/account_localizations.dart';
import '../shared/constants/account_access.dart';
import '../shared/enums/account_enums.dart';
import '../shared/utils/account_paths.dart';
import 'devices_controller.dart';
import 'step_up_gate.dart';
import 'widgets/account_widgets.dart';

/// Trusted devices, with the verifier device marked.
class DevicesScreen extends StatelessWidget {
  /// Devices screen backed by [repository].
  const DevicesScreen({
    super.key,
    required this.repository,
    required this.requestStepUp,
  });

  /// Source of the devices.
  final AccountRepository repository;

  /// The shell's step-up, for removing the trust of a device.
  final Future<bool> Function() requestStepUp;

  @override
  Widget build(BuildContext context) => ControllerBuilder<DevicesController>(
    create: (context) => DevicesController(
      repository,
      stepUp: StepUpGate.fromContext(
        context,
        rule: accountStepUpRule,
        request: requestStepUp,
      ),
    )..start(),
    builder: (context, controller) => AppPage(
      title: AccountLocalizations.of(context).devicesTitle,
      onBack: () => context.go(accountPath(AccountSection.overview)),
      body: AsyncValueView<List<DeviceSummary>>(
        value: controller.devices,
        errorMessage: AccountLocalizations.of(context).loadError,
        onRetry: controller.start,
        data: (devices) => _DevicesList(
          devices: devices,
          canRemoveTrust: controller.canRemoveTrust,
          onRemove: (id) async {
            final result = await controller.removeTrust(id);
            if (!context.mounted) return;
            final l10n = AccountLocalizations.of(context);
            showActionResult(
              context,
              result,
              success: l10n.deviceRemoved,
              failure: l10n.actionFailed,
            );
          },
        ),
      ),
    ),
  );
}

class _DevicesList extends StatelessWidget {
  const _DevicesList({
    required this.devices,
    required this.canRemoveTrust,
    required this.onRemove,
  });

  final List<DeviceSummary> devices;
  final bool canRemoveTrust;
  final ValueChanged<String> onRemove;

  @override
  Widget build(BuildContext context) {
    final l10n = AccountLocalizations.of(context);
    if (devices.isEmpty) {
      return EmptyState(
        icon: Icons.phonelink_lock_outlined,
        title: l10n.devicesEmptyTitle,
        message: l10n.devicesEmptyMessage,
      );
    }
    return ContentColumn(
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          for (final device in devices)
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.sm),
              child: AccountRowCard(
                title: device.name,
                details: [
                  platformLabel(l10n, device.platform),
                  _trustLabel(context, device),
                ],
                badge: device.verifier
                    ? StatusBadge(label: l10n.verifierBadge)
                    : null,
                trailing: canRemoveTrust
                    ? AppButton(
                        label: l10n.deviceRemove,
                        variant: AppButtonVariant.secondary,
                        onPressed: () => onRemove(device.id),
                      )
                    : null,
              ),
            ),
        ],
      ),
    );
  }

  String _trustLabel(BuildContext context, DeviceSummary device) {
    final l10n = AccountLocalizations.of(context);
    final until = device.trustedUntil;
    if (until == null) return l10n.noTrustDate;
    return l10n.trustedUntilLabel(formatDate(until, locale: context.localeTag));
  }
}
