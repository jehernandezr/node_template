// ignore_for_file: deprecated_member_use

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'account_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AccountLocalizationsEn extends AccountLocalizations {
  AccountLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get overviewTitle => 'My account';

  @override
  String organizationLine(String tenantName) {
    return 'Organization: $tenantName';
  }

  @override
  String get manageSection => 'Manage';

  @override
  String get sessionsLinkMessage =>
      'Devices with an open session and remote sign-out.';

  @override
  String get devicesLinkTitle => 'Devices';

  @override
  String get devicesLinkMessage => 'Trusted devices and the verifier.';

  @override
  String get securityLinkTitle => 'Security';

  @override
  String get securityLinkMessage =>
      'Two-step verification, passkeys and recovery codes.';

  @override
  String get agreementsLinkTitle => 'Agreements';

  @override
  String get agreementsLinkMessage => 'Terms, consents and signed documents.';

  @override
  String get actionFailed => 'The action could not be completed. Try again.';

  @override
  String get loadError => 'We could not load this information.';

  @override
  String versionLabel(String version) {
    return 'Version $version';
  }

  @override
  String createdOnLabel(String date) {
    return 'Created on $date';
  }

  @override
  String acceptedOnLabel(String date) {
    return 'Accepted on $date';
  }

  @override
  String deadlineLabel(String date) {
    return 'Deadline $date';
  }

  @override
  String trustedUntilLabel(String date) {
    return 'Trusted until $date';
  }

  @override
  String get noTrustDate => 'No trust date';

  @override
  String lastSeenLabel(String dateTime) {
    return 'Last activity: $dateTime';
  }

  @override
  String get stepUpTitle => 'Confirm your identity';

  @override
  String get stepUpMessage =>
      'This action is sensitive. Enter the code from your authenticator app to continue.';

  @override
  String get stepUpCodeLabel => '6-digit code';

  @override
  String get stepUpIncomplete => 'Enter all 6 digits of the code.';

  @override
  String get stepUpInvalid => 'The code is not valid. Try again.';

  @override
  String get sessionsTitle => 'Active sessions';

  @override
  String get sessionCurrent => 'Current';

  @override
  String get sessionClose => 'Close session';

  @override
  String get sessionClosed => 'Session closed.';

  @override
  String get sessionsCloseOthers => 'Close all others';

  @override
  String othersClosed(int count) {
    return 'Sessions closed: $count.';
  }

  @override
  String get sessionsEmptyTitle => 'No active sessions';

  @override
  String get sessionsEmptyMessage =>
      'When you sign in on a device it will appear here.';

  @override
  String get devicesTitle => 'Devices';

  @override
  String get verifierBadge => 'Verifier';

  @override
  String get deviceRemove => 'Remove';

  @override
  String get deviceRemoved => 'Device trust removed.';

  @override
  String get devicesEmptyTitle => 'No trusted devices';

  @override
  String get devicesEmptyMessage =>
      'Devices you trust to verify your identity will appear here.';

  @override
  String get securityTitle => 'Security';

  @override
  String get mfaTitle => 'Two-step verification';

  @override
  String mfaEnabled(String method) {
    return 'Enabled. Method: $method';
  }

  @override
  String get mfaDisabled => 'Disabled. Turn on two-step verification.';

  @override
  String get passkeysTitle => 'Passkeys';

  @override
  String get passkeyAdd => 'Add passkey';

  @override
  String get passkeyAdded => 'Passkey added.';

  @override
  String get passkeysEmpty => 'You have no passkeys yet.';

  @override
  String get recoveryTitle => 'Recovery codes';

  @override
  String get recoveryDescription =>
      'They let you in if you lose access to your devices. Each code works only once.';

  @override
  String get recoveryRegenerate => 'Regenerate recovery codes';

  @override
  String get recoveryRegenerated => 'Recovery codes regenerated.';

  @override
  String get recoveryCodesTitle => 'New recovery codes';

  @override
  String get recoveryCodesNotice =>
      'Store them somewhere safe. The previous codes no longer work.';

  @override
  String get agreementsTitle => 'Agreements';

  @override
  String get pendingSection => 'Pending';

  @override
  String get acceptedSection => 'Accepted';

  @override
  String get reviewAndAccept => 'Review and accept';

  @override
  String get accept => 'Accept';

  @override
  String get requiredLabel => 'Required';

  @override
  String get optionalLabel => 'Optional';

  @override
  String get reviewNotice =>
      'By accepting you confirm that you reviewed this document.';

  @override
  String get agreementAccepted => 'Agreement accepted.';

  @override
  String get pendingEmptyTitle => 'You have no pending agreements';

  @override
  String get acceptedEmptyMessage =>
      'You have not accepted any agreements yet.';
}
