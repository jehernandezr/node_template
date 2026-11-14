import '../constants/assistant_constants.dart';

/// Path of the chat of [conversationId].
String conversationPath(String conversationId) =>
    '$assistantBasePath/${Uri.encodeComponent(conversationId)}';
