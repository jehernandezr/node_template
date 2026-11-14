import 'package:shell_core/shell_core.dart';

/// Id of the microfrontend and first segment of its routes.
const MicrofrontendId assistantId = MicrofrontendId('assistant');

/// Base path of the microfrontend's routes.
const String assistantBasePath = '/assistant';

/// Name of the conversation id path parameter.
const String conversationIdParam = 'conversationId';

/// Menu label. The shell draws it before the microfrontend loads, so it
/// travels with the manifest instead of the deferred ARB files.
const MenuLabel assistantMenuLabel = MenuLabel({
  'es': 'Asistente',
  'en': 'Assistant',
});

/// Problem code the API returns when the plan's query quota is used up.
const String quotaExceededCode = 'BILLING.QUOTA.EXCEEDED';
