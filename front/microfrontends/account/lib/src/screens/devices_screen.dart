import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../account_format.dart';
import '../data/account_models.dart';
import '../data/account_repository.dart';
import '../l10n/generated/account_localizations.dart';
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
  late Future<List<TrustedDevice>> _devices = widget.repository.listDevices();

  void _reload() {
    setState(() {
      _devices = widget.repository.listDevices();
    });
  }

  Future<void> _removeTrust(TrustedDevice device) async {
    final verified = await confirmStepUp(context, widget.repository);
    if (!verified || !mounted) return;
    final done = await runAccountAction(
      context,
      () => widget.repository.removeDeviceTrust(device.id),
      success: AccountLocalizations.of(context).deviceRemoved,
    );
    if (done && mounted) _reload();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: () => context.go('/account')),
        title: Text(AccountLocalizations.of(context).devicesTitle),
      ),
      body: PlatformScreen(
        compact: (_) => AsyncView<List<TrustedDevice>>(
          future: _devices,
          onRetry: _reload,
          builder: (context, devices) => _buildList(context, devices),
        ),
      ),
    );
  }

  Widget _buildList(BuildContext context, List<TrustedDevice> devices) {
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
              subtitle: '${device.platform} · ${_trustLabel(context, device)}',
              badge: device.isVerifier
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

  String _trustLabel(BuildContext context, TrustedDevice device) {
    final l10n = AccountLocalizations.of(context);
    final until = device.trustedUntil;
    if (until == null) return l10n.noTrustDate;
    return l10n.trustedUntilLabel(formatDate(until));
  }
}
