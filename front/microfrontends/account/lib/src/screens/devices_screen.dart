import 'package:contracts/contracts.dart' show DeviceSummary;
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/account_repository.dart';
import '../l10n/generated/account_localizations.dart';
import '../shared/enums/account_enums.dart';
import '../shared/utils/account_format.dart';
import '../shared/utils/account_paths.dart';
import '../widgets/account_labels.dart';
import '../widgets/account_widgets.dart';
import '../widgets/step_up_dialog.dart';

/// Dispositivos de confianza, con el verificador marcado.
class DevicesScreen extends StatefulWidget {
  const DevicesScreen({super.key, required this.repository});

  final AccountRepository repository;

  @override
  State<DevicesScreen> createState() => _DevicesScreenState();
}

class _DevicesScreenState extends State<DevicesScreen> {
  AsyncValue<List<DeviceSummary>> _devices = const AsyncValue.loading();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final result = await AsyncValue.guard(widget.repository.listDevices);
    if (!mounted) return;
    setState(() => _devices = result);
  }

  void _reload() {
    setState(() => _devices = const AsyncValue.loading());
    _load();
  }

  Future<void> _removeTrust(DeviceSummary device) async {
    final l10n = AccountLocalizations.of(context);
    final verified = await confirmStepUp(context, widget.repository);
    if (!verified || !mounted) return;
    final done = await runAccountAction(
      context,
      () => widget.repository.removeDeviceTrust(device.id),
      success: () => l10n.deviceRemoved,
    );
    if (done && mounted) _reload();
  }

  @override
  Widget build(BuildContext context) {
    return AppPage(
      title: AccountLocalizations.of(context).devicesTitle,
      onBack: () => context.go(accountPath(AccountSection.overview)),
      body: PlatformScreen(
        compact: (_) => AccountAsyncView<List<DeviceSummary>>(
          value: _devices,
          onRetry: _reload,
          data: (devices) => _buildList(context, devices),
        ),
      ),
    );
  }

  Widget _buildList(BuildContext context, List<DeviceSummary> devices) {
    final l10n = AccountLocalizations.of(context);
    if (devices.isEmpty) {
      return EmptyState(
        icon: Icons.phonelink_lock_outlined,
        title: l10n.devicesEmptyTitle,
        message: l10n.devicesEmptyMessage,
      );
    }
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        for (final device in devices)
          Padding(
            padding: const EdgeInsets.only(top: AppSpacing.sm),
            child: AccountRowCard(
              title: device.name,
              subtitle:
                  '${platformLabel(l10n, device.platform)} · ${_trustLabel(l10n, device)}',
              badge: device.verifier
                  ? StatusBadge(label: l10n.verifierBadge)
                  : null,
              trailing: AppButton(
                label: l10n.deviceRemove,
                variant: AppButtonVariant.secondary,
                onPressed: () => _removeTrust(device),
              ),
            ),
          ),
      ],
    );
  }

  String _trustLabel(AccountLocalizations l10n, DeviceSummary device) {
    final until = device.trustedUntil;
    if (until == null) return l10n.noTrustDate;
    return l10n.trustedUntilLabel(formatDate(until));
  }
}
