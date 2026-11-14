// ignore_for_file: deprecated_member_use

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'assistant_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AssistantLocalizationsEn extends AssistantLocalizations {
  AssistantLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get title => 'Assistant';

  @override
  String get chatTitle => 'Conversation';

  @override
  String get newConversation => 'New conversation';

  @override
  String get emptyConversations => 'You have no conversations yet';

  @override
  String get listError => 'We could not load your conversations.';

  @override
  String get createError => 'We could not create the conversation.';

  @override
  String get loadMessagesError => 'We could not load the conversation.';

  @override
  String get genericError => 'An unexpected error occurred.';

  @override
  String get quotaExceeded => 'You have reached your plan\'s query limit.';

  @override
  String get inputHint => 'Type your question';

  @override
  String get send => 'Send';

  @override
  String get stop => 'Stop';

  @override
  String get streaming => 'Writing...';

  @override
  String get stopped => 'Answer stopped.';

  @override
  String get sources => 'Sources';

  @override
  String usage(int input, int output) {
    return 'Tokens: $input input and $output output';
  }

  @override
  String get toolRequestTitle => 'The assistant wants to run an action';

  @override
  String get toolConfirm => 'Confirm';

  @override
  String get toolCancel => 'Cancel';

  @override
  String get toolConfirmed => 'Action confirmed';

  @override
  String get toolRejected => 'Action cancelled';
}
